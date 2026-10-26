// GET /api/auth/<provider>/callback?code=…&state=… → find or create the member, start a session, go back to the page
import { configured, parseCookies, cookie, safeReturn, getDb, randomToken, createSession } from '../../../../server/lib.js';
import { fetchProfile } from '../../../../server/oauth.js';

function back(origin, ret, status, extraCookies = []) {
  const to = new URL(safeReturn(ret), origin);
  to.searchParams.set('login', status);
  const headers = new Headers({ location: to.pathname + to.search + to.hash, 'cache-control': 'no-store' });
  ['vg_state', 'vg_return', 'vg_pkce'].forEach((n) => headers.append('set-cookie', cookie(n, '', { maxAge: 0, path: '/api/auth' })));
  extraCookies.forEach((c) => headers.append('set-cookie', c));
  return new Response(null, { status: 302, headers });
}

export async function onRequestGet({ request, env, params }) {
  const provider = params.provider;
  if (!configured(env, provider)) return new Response('Login is not available.', { status: 404 });
  const url = new URL(request.url);
  const c = parseCookies(request);
  let ret = '/';
  try { ret = decodeURIComponent(c.vg_return || '%2F'); } catch (e) { /* keep "/" */ }
  if (url.searchParams.get('error')) return back(url.origin, ret, 'cancel');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || c.vg_state !== `${provider}.${state}`) return back(url.origin, ret, 'expired');

  let profile;
  try {
    profile = await fetchProfile(provider, env, { code, state, redirectUri: `${url.origin}/api/auth/${provider}/callback`, verifier: c.vg_pkce });
  } catch (e) {
    console.error('login failed', provider, e && e.message);
    return back(url.origin, ret, 'fail');
  }

  const db = await getDb(env);
  const now = Date.now();
  let user = await db.prepare('SELECT id FROM users WHERE provider = ? AND provider_uid = ?').bind(provider, profile.uid).first();
  if (user) {
    await db.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now, user.id).run();
  } else {
    /* never the real name from the login service: reviews are public, so everyone starts with a random nickname */
    const nickname = '여행자' + Math.floor(1000 + Math.random() * 9000);
    user = { id: randomToken(12) };
    await db.prepare('INSERT INTO users (id, provider, provider_uid, nickname, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.id, provider, profile.uid, nickname, now, now).run();
  }
  return back(url.origin, ret, 'ok', [await createSession(db, user.id)]);
}
