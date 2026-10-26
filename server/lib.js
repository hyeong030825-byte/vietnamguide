// Shared code for the Cloudflare Pages Functions in /functions (login, sync, reviews).
// Needs a D1 binding named DB and, per login provider, the secrets listed in PROVIDERS.
// Everything stays hidden on the site until at least one provider is fully configured.

export const SESSION_COOKIE = 'vg_session';
const SESSION_DAYS = 30;

/* which secrets each login needs (set in Cloudflare: Settings → Variables and Secrets) */
export const PROVIDERS = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  kakao: ['KAKAO_REST_API_KEY'], // KAKAO_CLIENT_SECRET only if "Client Secret" is turned on in Kakao Developers
  naver: ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'],
};

export function configured(env, provider) {
  return !!(env && env.DB && PROVIDERS[provider] && PROVIDERS[provider].every((k) => env[k]));
}
export function configuredProviders(env) {
  return Object.keys(PROVIDERS).filter((p) => configured(env, p));
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function parseCookies(request) {
  const out = {};
  (request.headers.get('cookie') || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

export function cookie(name, value, { maxAge, path = '/' } = {}) {
  let c = `${name}=${value}; Path=${path}; HttpOnly; Secure; SameSite=Lax`;
  if (maxAge != null) c += `; Max-Age=${maxAge}`;
  return c;
}

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function randomToken(bytes = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256B64url(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return b64url(new Uint8Array(buf));
}

/* only same-site paths like "/" or "/#prep" are allowed as the place to return to after login */
export function safeReturn(path) {
  return typeof path === 'string' && path.length < 200 && /^\/(?![/\\])[^\s]*$/.test(path) ? path : '/';
}

/* plain text for nicknames and reviews: no control characters, collapsed spaces */
export function cleanText(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_uid TEXT NOT NULL,
     nickname TEXT NOT NULL, created_at INTEGER NOT NULL, last_login INTEGER NOT NULL, UNIQUE (provider, provider_uid))`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS userdata (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, item TEXT NOT NULL, user_id TEXT NOT NULL, rating INTEGER NOT NULL,
     body TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, reports INTEGER NOT NULL DEFAULT 0,
     hidden INTEGER NOT NULL DEFAULT 0, UNIQUE (item, user_id))`,
  `CREATE INDEX IF NOT EXISTS reviews_item ON reviews (item, created_at)`,
  `CREATE INDEX IF NOT EXISTS reviews_user ON reviews (user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS review_reports (review_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (review_id, user_id))`,
];
let schemaReady = false;
/* tables are created on first use, so no migration step is needed in the dashboard */
export async function getDb(env) {
  if (!schemaReady) {
    await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
    schemaReady = true;
  }
  return env.DB;
}

export async function currentUser(context) {
  const { request, env } = context;
  if (!env.DB) return null;
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || token.length > 100) return null;
  const db = await getDb(env);
  const row = await db
    .prepare('SELECT u.id, u.provider, u.nickname, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256Hex(token), Date.now())
    .first();
  return row || null;
}

export function isAdmin(env, user) {
  return !!(user && env.ADMIN_USER_IDS && String(env.ADMIN_USER_IDS).split(',').map((s) => s.trim()).includes(user.id));
}

export async function createSession(db, userId) {
  const token = randomToken(32);
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * 864e5),
  ]);
  return cookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400 });
}
export const clearSessionCookie = () => cookie(SESSION_COOKIE, '', { maxAge: 0 });

export async function readJson(request, maxBytes = 65536) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try { return JSON.parse(text || '{}'); } catch (e) { throw new HttpError(400, 'bad_json'); }
}
export class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
