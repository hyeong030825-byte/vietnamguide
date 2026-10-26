// POST /api/report {id} → report a review. Three reports from different people hide it until an admin looks.
import { json, currentUser, getDb, readJson, HttpError } from '../../server/lib.js';

const HIDE_AT = 3;

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const { id } = await readJson(context.request, 1024);
  const db = await getDb(context.env);
  const row = await db.prepare('SELECT user_id FROM reviews WHERE id = ?').bind(String(id || '')).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.user_id === user.id) throw new HttpError(400, 'own_review');
  await db.prepare('INSERT OR IGNORE INTO review_reports (review_id, user_id, created_at) VALUES (?, ?, ?)').bind(id, user.id, Date.now()).run();
  const n = await db.prepare('SELECT COUNT(*) AS n FROM review_reports WHERE review_id = ?').bind(id).first();
  await db.prepare('UPDATE reviews SET reports = ?, hidden = CASE WHEN ? >= ? THEN 1 ELSE hidden END WHERE id = ?').bind(n.n, n.n, HIDE_AT, id).run();
  return json({ ok: true });
}
