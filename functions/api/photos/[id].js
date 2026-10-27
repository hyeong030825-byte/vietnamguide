// GET /api/photos/<id> → the image. Photos of a hidden or unposted 여행기 / review are only shown to their owner and admins.
import { currentUser, getDb, isAdmin } from '../../../server/lib.js';
import { readPhoto } from '../../../server/photos.js';

const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });

export async function onRequestGet(context) {
  const id = String(context.params.id || '');
  if (!/^[\w-]{8,40}$/.test(id)) return notFound();
  const db = await getDb(context.env);
  const meta = await db.prepare(
    `SELECT p.id, p.user_id, p.store, p.type, s.hidden AS story_hidden, r.hidden AS review_hidden FROM photos p
     LEFT JOIN stories s ON s.id = p.story_id LEFT JOIN reviews r ON r.id = p.review_id WHERE p.id = ?`
  ).bind(id).first();
  if (!meta) return notFound();
  const open = meta.story_hidden === 0 || meta.review_hidden === 0;  // attached to a visible 여행기 or review
  if (!open) {
    const user = await currentUser(context);
    if (!user || (user.id !== meta.user_id && !isAdmin(context.env, user))) return notFound();
  }
  const bytes = await readPhoto(context.env, db, meta);
  if (!bytes) return notFound();
  return new Response(bytes, {
    headers: {
      'content-type': meta.type,
      'cache-control': open ? 'public, max-age=86400' : 'private, no-store',
      'content-security-policy': "default-src 'none'",
    },
  });
}
