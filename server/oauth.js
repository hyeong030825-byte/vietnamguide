// Google / Kakao / Naver login (OAuth 2.0 authorization code flow).
// Only the provider's user id and nickname are kept; no email or phone number is requested.
import { randomToken, sha256B64url } from './lib.js';

const form = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== ''));

async function getJson(res, what) {
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!res.ok || !data) throw new Error(`${what} failed (${res.status})`);
  return data;
}

/* where to send the user to log in; `extra` holds values to keep in a short-lived cookie (PKCE verifier) */
export async function authorizeUrl(provider, env, redirectUri, state) {
  if (provider === 'google') {
    const verifier = randomToken(48);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + form({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'openid profile',
      state, code_challenge: await sha256B64url(verifier), code_challenge_method: 'S256', prompt: 'select_account',
    });
    return { url, verifier };
  }
  if (provider === 'kakao') {
    return { url: 'https://kauth.kakao.com/oauth/authorize?' + form({ client_id: env.KAKAO_REST_API_KEY, redirect_uri: redirectUri, response_type: 'code', state }) };
  }
  if (provider === 'naver') {
    return { url: 'https://nid.naver.com/oauth2.0/authorize?' + form({ response_type: 'code', client_id: env.NAVER_CLIENT_ID, redirect_uri: redirectUri, state }) };
  }
  throw new Error('unknown provider');
}

const POST_FORM = { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' } };

/* code → { uid, nickname } */
export async function fetchProfile(provider, env, { code, state, redirectUri, verifier }) {
  if (provider === 'google') {
    const tok = await getJson(await fetch('https://oauth2.googleapis.com/token', { ...POST_FORM, body: form({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri,
      grant_type: 'authorization_code', code_verifier: verifier,
    }) }), 'google token');
    const me = await getJson(await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: 'Bearer ' + tok.access_token } }), 'google userinfo');
    if (!me.sub) throw new Error('google: no user id');
    return { uid: String(me.sub), nickname: me.name || me.given_name || '' };
  }
  if (provider === 'kakao') {
    const tok = await getJson(await fetch('https://kauth.kakao.com/oauth/token', { ...POST_FORM, body: form({
      grant_type: 'authorization_code', client_id: env.KAKAO_REST_API_KEY, redirect_uri: redirectUri, code,
      client_secret: env.KAKAO_CLIENT_SECRET,
    }) }), 'kakao token');
    const me = await getJson(await fetch('https://kapi.kakao.com/v2/user/me', { headers: { authorization: 'Bearer ' + tok.access_token } }), 'kakao user');
    if (me.id == null) throw new Error('kakao: no user id');
    const acc = me.kakao_account || {};
    return { uid: String(me.id), nickname: (acc.profile && acc.profile.nickname) || (me.properties && me.properties.nickname) || '' };
  }
  if (provider === 'naver') {
    const tok = await getJson(await fetch('https://nid.naver.com/oauth2.0/token', { ...POST_FORM, body: form({
      grant_type: 'authorization_code', client_id: env.NAVER_CLIENT_ID, client_secret: env.NAVER_CLIENT_SECRET, code, state,
    }) }), 'naver token');
    if (!tok.access_token) throw new Error('naver: ' + (tok.error || 'no token'));
    const me = await getJson(await fetch('https://openapi.naver.com/v1/nid/me', { headers: { authorization: 'Bearer ' + tok.access_token } }), 'naver user');
    if (!me.response || !me.response.id) throw new Error('naver: no user id');
    return { uid: String(me.response.id), nickname: me.response.nickname || me.response.name || '' };
  }
  throw new Error('unknown provider');
}
