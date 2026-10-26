// All /api routes: same-origin check for writes, JSON errors, no caching.
import { json, HttpError } from '../../server/lib.js';

export async function onRequest(context) {
  const { request } = context;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: 'bad_origin' }, 403);
  }
  try {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set('x-content-type-options', 'nosniff');
    if (!out.headers.has('cache-control')) out.headers.set('cache-control', 'no-store');
    return out;
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code }, e.status);
    console.error(e && e.stack || e);
    return json({ error: 'server' }, 500);
  }
}
