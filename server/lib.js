// Shared code for the Cloudflare Pages Functions in /functions (login, sync, reviews).
// Needs a D1 binding named DB ("db" also works) and, per login provider, the secrets listed in PROVIDERS.
// Everything stays hidden on the site until at least one provider is fully configured.

export const SESSION_COOKIE = 'vg_session';
const SESSION_DAYS = 30;

/* which secrets each login needs (set in Cloudflare: Settings → Variables and Secrets) */
export const PROVIDERS = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  kakao: ['KAKAO_REST_API_KEY'], // KAKAO_CLIENT_SECRET only if "Client Secret" is turned on in Kakao Developers
  naver: ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'],
};

/* the D1 database; Cloudflare binding names are case-sensitive, so accept "DB" or "db" */
export function dbBinding(env) {
  return (env && (env.DB || env.db)) || null;
}

export function configured(env, provider) {
  return !!(dbBinding(env) && PROVIDERS[provider] && PROVIDERS[provider].every((k) => env[k]));
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
  `CREATE INDEX IF NOT EXISTS reviews_time ON reviews (created_at)`,
  /* 여행기 (trip stories) with up to 6 photos each; photo_parts holds the image (base64 in 90 KB pieces) when there is no R2 bucket */
  `CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, city TEXT NOT NULL, trip TEXT NOT NULL DEFAULT '',
     rating INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, photos TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL, reports INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS stories_time ON stories (created_at)`,
  `CREATE INDEX IF NOT EXISTS stories_city ON stories (city, created_at)`,
  `CREATE INDEX IF NOT EXISTS stories_user ON stories (user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS story_reports (story_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (story_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, story_id TEXT, store TEXT NOT NULL, type TEXT NOT NULL,
     size INTEGER NOT NULL, width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS photos_user ON photos (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS photos_story ON photos (story_id)`,
  `CREATE TABLE IF NOT EXISTS photo_parts (id TEXT NOT NULL, part INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (id, part))`,
];
let schemaReady = false;
/* tables are created on first use, so no migration step is needed in the dashboard */
export async function getDb(env) {
  if (!schemaReady) {
    const db = dbBinding(env);
    await db.batch(SCHEMA.map((s) => db.prepare(s)));
    schemaReady = true;
  }
  return dbBinding(env);
}

export async function currentUser(context) {
  const { request, env } = context;
  if (!dbBinding(env)) return null;
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
/* cities a 여행기 can be about (same ids as CITIES on the page) */
export const CITY_IDS = ['danang', 'nhatrang', 'phuquoc', 'hanoi', 'hcmc', 'dalat', 'other'];

export class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
