// GET /api/me → who is logged in (?check=name → can I use this nickname?) · PATCH → change nickname · DELETE → delete the account and everything in it
// (reviews, 여행기 with their photos and comments, my comments, synced data, reports, sessions)
import { json, currentUser, getDb, isAdmin, readJson, clearSessionCookie, cleanNickname, nicknameProblem, nicknameTaken, isUniqueError, HttpError } from '../../server/lib.js';
import { deletePhotosWhere } from '../../server/photos.js';

export async function onRequestGet(context) {
  const user = await currentUser(context);
  const check = new URL(context.request.url).searchParams.get('check');
  if (check != null) {
    if (!user) throw new HttpError(401, 'login_required');
    const name = cleanNickname(check);
    if (name.toLowerCase() === user.nickname.toLowerCase()) return json({ ok: true, same: true, name });
    const problem = nicknameProblem(name) || (await nicknameTaken(await getDb(context.env), name, user.id) ? 'nickname_taken' : null);
    return json({ ok: !problem, error: problem, name });
  }
  if (!user) return json({ user: null });
  return json({ user: { id: user.id, nickname: user.nickname, provider: user.provider, createdAt: user.created_at, admin: isAdmin(context.env, user) } });
}

export async function onRequestPatch(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const body = await readJson(context.request, 2048);
  const nickname = cleanNickname(body.nickname);
  const problem = nicknameProblem(nickname);
  if (problem) throw new HttpError(400, problem);
  const db = await getDb(context.env);
  if (await nicknameTaken(db, nickname, user.id)) throw new HttpError(409, 'nickname_taken');
  try {
    await db.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, user.id).run();
  } catch (e) {
    if (isUniqueError(e)) throw new HttpError(409, 'nickname_taken');  // taken a moment ago by someone else
    throw e;
  }
  return json({ ok: true, nickname });
}

export async function onRequestDelete(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const db = await getDb(context.env);
  await deletePhotosWhere(context.env, db, 'user_id = ?', user.id);
  await db.batch([
    db.prepare(`DELETE FROM comment_reports WHERE user_id = ? OR comment_id IN
      (SELECT id FROM comments WHERE user_id = ? OR story_id IN (SELECT id FROM stories WHERE user_id = ?))`).bind(user.id, user.id, user.id),
    db.prepare('DELETE FROM comments WHERE user_id = ? OR story_id IN (SELECT id FROM stories WHERE user_id = ?)').bind(user.id, user.id),
    db.prepare('DELETE FROM story_reports WHERE user_id = ? OR story_id IN (SELECT id FROM stories WHERE user_id = ?)').bind(user.id, user.id),
    db.prepare('DELETE FROM stories WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM review_reports WHERE user_id = ? OR review_id IN (SELECT id FROM reviews WHERE user_id = ?)').bind(user.id, user.id),
    db.prepare('DELETE FROM reviews WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM userdata WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
