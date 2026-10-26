// GET /api/auth/google/login?return=/%23prep → go to the provider's login page
import { configured, randomToken, cookie, safeReturn } from '../../../../server/lib.js';
import { authorizeUrl } from '../../../../server/oauth.js';

export async function onRequestGet({ request, env, params }) {
  const provider = params.provider;
  if (!configured(env, provider)) return new Response('Login is not available.', { status: 404 });
  const url = new URL(request.url);
  const state = randomToken(24);
  const { url: to, verifier } = await authorizeUrl(provider, env, `${url.origin}/api/auth/${provider}/callback`, state);
  const headers = new Headers({ location: to, 'cache-control': 'no-store' });
  const short = { maxAge: 600, path: '/api/auth' };
  headers.append('set-cookie', cookie('vg_state', `${provider}.${state}`, short));
  headers.append('set-cookie', cookie('vg_return', encodeURIComponent(safeReturn(url.searchParams.get('return'))), short));
  if (verifier) headers.append('set-cookie', cookie('vg_pkce', verifier, short));
  return new Response(null, { status: 302, headers });
}
