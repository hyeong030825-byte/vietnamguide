// POST /api/auth/logout → end this session
import { json, parseCookies, getDb, dbBinding, sha256Hex, clearSessionCookie, SESSION_COOKIE } from '../../../server/lib.js';

export async function onRequestPost({ request, env }) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token && dbBinding(env)) {
    const db = await getDb(env);
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
