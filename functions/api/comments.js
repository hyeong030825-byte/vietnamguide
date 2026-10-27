// Comments on 여행기: anyone can read, members write.
// GET    /api/comments?story=…  → comments on one 여행기, oldest first
// POST   /api/comments {story, body}
// DELETE /api/comments?id=…     → delete my comment (admins: any)
import { json, currentUser, getDb, isAdmin, readJson, cleanText, randomToken, HttpError } from '../../server/lib.js';

const BODY_MIN = 2, BODY_MAX = 500, PER_DAY = 30;

/* the 여행기 must exist and be visible to this person */
async function visibleStory(db, id, user, admin) {
  const s = await db.prepare('SELECT id, user_id, hidden FROM stories WHERE id = ?').bind(String(id || '')).first();
  if (!s || (s.hidden && !admin && !(user && user.id === s.user_id))) throw new HttpError(404, 'not_found');
  return s;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const db = await getDb(context.env);
  const user = await currentUser(context);
  const admin = isAdmin(context.env, user);
  const story = await visibleStory(db, url.searchParams.get('story'), user, admin);
  const rows = (await db.prepare(
    `SELECT c.id, c.body, c.created_at, c.updated_at, c.hidden, c.user_id, u.nickname FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.story_id = ? AND (c.hidden = 0 OR c.user_id = ? OR ?) ORDER BY c.created_at ASC LIMIT 300`
  ).bind(story.id, user ? user.id : '', admin ? 1 : 0).all()).results || [];
  return json({
    comments: rows.map((c) => ({
      id: c.id, body: c.body, nickname: c.nickname, createdAt: c.created_at, edited: c.updated_at !== c.created_at,
      mine: !!user && c.user_id === user.id, author: c.user_id === story.user_id, hidden: !!c.hidden,
    })),
    canDelete: admin,
  });
}

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const b = await readJson(context.request, 4096);
  const body = cleanText(b.body, BODY_MAX);
  if (body.length < BODY_MIN) throw new HttpError(400, 'body_short');
  const db = await getDb(context.env);
  const story = await visibleStory(db, b.story, user, false);
  if (story.hidden) throw new HttpError(403, 'hidden');
  const now = Date.now();
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM comments WHERE user_id = ? AND created_at > ?').bind(user.id, now - 864e5).first();
  if (recent && recent.n >= PER_DAY) throw new HttpError(429, 'too_many');
  const id = randomToken(12);
  await db.prepare('INSERT INTO comments (id, story_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, story.id, user.id, body, now, now).run();
  return json({ ok: true, id });
}

export async function onRequestDelete(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const id = new URL(context.request.url).searchParams.get('id') || '';
  const db = await getDb(context.env);
  const row = await db.prepare('SELECT user_id FROM comments WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.user_id !== user.id && !isAdmin(context.env, user)) throw new HttpError(403, 'not_yours');
  await db.batch([
    db.prepare('DELETE FROM comment_reports WHERE comment_id = ?').bind(id),
    db.prepare('DELETE FROM comments WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}
