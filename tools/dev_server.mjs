// Local test server: serves site/ and runs functions/api/* like Cloudflare Pages Functions,
// with D1 on node:sqlite and fake Google/Kakao/Naver login servers. For tests only.
//   node tools/dev_server.mjs [port] [sqlite-file]
// The fake providers accept any authorization code: the code becomes the user id ("code=alice" → user alice).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8788);
const DB_FILE = process.argv[3] || ':memory:';

/* ---- D1 on node:sqlite ---- */
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async first(col) { const r = this.db.prepare(this.sql).get(...this.args); return r ? (col ? r[col] : { ...r }) : null; }
  async all() { return { success: true, results: this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...r })) }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes) } }; }
}
class D1 {
  constructor(file) { this.db = new DatabaseSync(file); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(list) {
    this.db.exec('BEGIN');
    try { const out = []; for (const s of list) out.push(await s.run()); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
}

const env = {
  DB: process.env.NO_DB ? undefined : new D1(DB_FILE),
  GOOGLE_CLIENT_ID: 'test-google-id', GOOGLE_CLIENT_SECRET: 'test-google-secret',
  KAKAO_REST_API_KEY: 'test-kakao-key',
  NAVER_CLIENT_ID: process.env.NO_NAVER ? '' : 'test-naver-id', NAVER_CLIENT_SECRET: process.env.NO_NAVER ? '' : 'test-naver-secret',
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS || '',
};
/* R2 stand-in (PHOTOS=1): photos kept in memory instead of D1 */
if (process.env.PHOTOS) {
  const objects = new Map();
  env.PHOTOS = {
    async put(key, bytes, opts) { objects.set(key, { bytes: new Uint8Array(bytes), type: opts && opts.httpMetadata && opts.httpMetadata.contentType }); },
    async get(key) { const o = objects.get(key); return o ? { arrayBuffer: async () => o.bytes.buffer.slice(o.bytes.byteOffset, o.bytes.byteOffset + o.bytes.length) } : null; },
    async delete(keys) { [].concat(keys).forEach((k) => objects.delete(k)); },
    _objects: objects,
  };
}

/* ---- fake login providers ---- */
const realFetch = globalThis.fetch;
const reply = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const body = init.body ? new URLSearchParams(init.body.toString()) : null;
  const bearer = (init.headers && (init.headers.authorization || init.headers.Authorization)) || '';
  const who = bearer.replace('Bearer tok-', '');
  switch (url.host + url.pathname) {
    case 'oauth2.googleapis.com/token':
      if (body.get('client_secret') !== env.GOOGLE_CLIENT_SECRET || !body.get('code_verifier') || !body.get('redirect_uri')) return reply({ error: 'invalid_request' }, 400);
      return reply({ access_token: 'tok-' + body.get('code') });
    case 'openidconnect.googleapis.com/v1/userinfo':
      return reply({ sub: 'g-' + who, name: who === 'noname' ? '' : 'Google ' + who });
    case 'kauth.kakao.com/oauth/token':
      if (body.get('client_id') !== env.KAKAO_REST_API_KEY) return reply({ error: 'invalid_client' }, 401);
      return reply({ access_token: 'tok-' + body.get('code') });
    case 'kapi.kakao.com/v2/user/me':
      return reply({ id: 1000 + who.length, kakao_account: { profile: { nickname: '카카오 ' + who } } });
    case 'nid.naver.com/oauth2.0/token':
      if (body.get('client_secret') !== env.NAVER_CLIENT_SECRET) return reply({ error: 'invalid_client' });
      return reply({ access_token: 'tok-' + body.get('code') });
    case 'openapi.naver.com/v1/nid/me':
      return reply({ resultcode: '00', response: { id: 'n-' + who, nickname: '네이버 ' + who } });
  }
  return realFetch(input, init);
};

/* ---- Pages Functions routing ---- */
const ROUTES = [
  [/^\/api\/config$/, 'config.js'], [/^\/api\/me$/, 'me.js'], [/^\/api\/data$/, 'data.js'],
  [/^\/api\/reviews$/, 'reviews.js'], [/^\/api\/report$/, 'report.js'], [/^\/api\/auth\/logout$/, 'auth/logout.js'],
  [/^\/api\/stories$/, 'stories.js'], [/^\/api\/comments$/, 'comments.js'], [/^\/api\/photos$/, 'photos/index.js'], [/^\/api\/photos\/([^/]+)$/, 'photos/[id].js', 'id'],
  [/^\/api\/auth\/([^/]+)\/login$/, 'auth/[provider]/login.js', 'provider'],
  [/^\/api\/auth\/([^/]+)\/callback$/, 'auth/[provider]/callback.js', 'provider'],
];
const mod = (rel) => import(pathToFileURL(path.join(ROOT, 'functions', 'api', rel)).href);
const METHOD = { GET: 'onRequestGet', POST: 'onRequestPost', PUT: 'onRequestPut', PATCH: 'onRequestPatch', DELETE: 'onRequestDelete' };

async function handleApi(request) {
  const { pathname } = new URL(request.url);
  const route = ROUTES.find(([re]) => re.test(pathname));
  const params = {};
  if (route && route[2]) params[route[2]] = pathname.match(route[0])[1];
  const mw = await mod('_middleware.js');
  const next = async () => {
    if (!route) return new Response('Not found', { status: 404 });
    const m = await mod(route[1]);
    const fn = m[METHOD[request.method]] || m.onRequest;
    if (!fn) return new Response('Method not allowed', { status: 405 });
    return fn({ request, env, params, data: {}, waitUntil(p) { Promise.resolve(p).catch(() => {}); } });
  };
  return mw.onRequest({ request, env, params, next, data: {} });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
function staticFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, 'site', p);
  if (!file.startsWith(path.join(ROOT, 'site'))) return null;
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request(`http://localhost:${PORT}${req.url}`, {
        method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      const r = await handleApi(request);
      const headers = {};
      r.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
      const cookies = r.headers.getSetCookie();
      if (cookies.length) headers['set-cookie'] = cookies;
      res.writeHead(r.status, headers);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    const file = staticFile(req.url);
    if (!file) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e); res.writeHead(500); res.end('dev server error');
  }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT} (db ${DB_FILE})`));
