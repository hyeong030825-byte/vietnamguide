// POST /api/photos?w=1280&h=960 (body: the image) → {id}. Logged-in members only; the photo stays unattached
// until a 여행기 that lists it is saved, and unattached photos are removed after a day.
import { json, currentUser, getDb, randomToken, HttpError } from '../../../server/lib.js';
import { PHOTO_MAX_BYTES, UPLOADS_PER_DAY, sniffType, stripMetadata, savePhoto, cleanOrphans } from '../../../server/photos.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > PHOTO_MAX_BYTES) throw new HttpError(413, 'too_large');
  const raw = new Uint8Array(await request.arrayBuffer());
  if (!raw.length) throw new HttpError(400, 'empty');
  if (raw.length > PHOTO_MAX_BYTES) throw new HttpError(413, 'too_large');
  const type = sniffType(raw);
  if (!type) throw new HttpError(415, 'bad_type');
  const bytes = stripMetadata(raw, type);
  if (!bytes) throw new HttpError(415, 'bad_image');

  const db = await getDb(env);
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM photos WHERE user_id = ? AND created_at > ?').bind(user.id, Date.now() - 864e5).first();
  if (recent && recent.n >= UPLOADS_PER_DAY) throw new HttpError(429, 'too_many');

  const url = new URL(request.url);
  const dim = (k) => Math.max(0, Math.min(8000, Math.round(Number(url.searchParams.get(k)) || 0)));
  const id = randomToken(12);
  await savePhoto(env, db, { id, userId: user.id, bytes, type, width: dim('w'), height: dim('h') });
  context.waitUntil(cleanOrphans(env, db).catch(() => {}));
  return json({ ok: true, id, w: dim('w'), h: dim('h') });
}
