// POST /api/report {id, type?} → report a place review (default), a 여행기 (type: "story") or a comment (type: "comment").
// Three reports from different people hide it until an admin looks.
import { json, currentUser, getDb, readJson, HttpError } from '../../server/lib.js';

const HIDE_AT = 3;
const KINDS = {
  review: { table: 'reviews', reports: 'review_reports', key: 'review_id' },
  story: { table: 'stories', reports: 'story_reports', key: 'story_id' },
  comment: { table: 'comments', reports: 'comment_reports', key: 'comment_id' },
};

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const b = await readJson(context.request, 1024);
  const k = KINDS[b.type || 'review'];
  if (!k) throw new HttpError(400, 'bad_type');
  const id = String(b.id || '');
  const db = await getDb(context.env);
  const row = await db.prepare(`SELECT user_id FROM ${k.table} WHERE id = ?`).bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.user_id === user.id) throw new HttpError(400, 'own_post');
  await db.prepare(`INSERT OR IGNORE INTO ${k.reports} (${k.key}, user_id, created_at) VALUES (?, ?, ?)`).bind(id, user.id, Date.now()).run();
  const n = await db.prepare(`SELECT COUNT(*) AS n FROM ${k.reports} WHERE ${k.key} = ?`).bind(id).first();
  await db.prepare(`UPDATE ${k.table} SET reports = ?, hidden = CASE WHEN ? >= ? THEN 1 ELSE hidden END WHERE id = ?`).bind(n.n, n.n, HIDE_AT, id).run();
  return json({ ok: true });
}
