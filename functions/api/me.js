// GET /api/me → who is logged in · PATCH → change nickname · DELETE → delete the account and everything in it
import { json, currentUser, getDb, isAdmin, readJson, cleanText, clearSessionCookie, HttpError } from '../../server/lib.js';

export async function onRequestGet(context) {
  const user = await currentUser(context);
  if (!user) return json({ user: null });
  return json({ user: { id: user.id, nickname: user.nickname, provider: user.provider, createdAt: user.created_at, admin: isAdmin(context.env, user) } });
}

export async function onRequestPatch(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const body = await readJson(context.request, 2048);
  const nickname = cleanText(body.nickname, 20).replace(/\n/g, ' ');
  if (nickname.length < 2) throw new HttpError(400, 'nickname_short');
  const db = await getDb(context.env);
  await db.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, user.id).run();
  return json({ ok: true, nickname });
}

export async function onRequestDelete(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const db = await getDb(context.env);
  await db.batch([
    db.prepare('DELETE FROM review_reports WHERE user_id = ? OR review_id IN (SELECT id FROM reviews WHERE user_id = ?)').bind(user.id, user.id),
    db.prepare('DELETE FROM reviews WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM userdata WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
