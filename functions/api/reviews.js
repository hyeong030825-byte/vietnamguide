// GET  /api/reviews?item=r:eat_dn_baduong   → reviews for one card
// GET  /api/reviews?items=a,b,c              → count and average rating for several cards
// GET  /api/reviews?feed=1[&items=a,b][&before=ms] → newest reviews across cards (여행 후기 tab)
// POST /api/reviews {item, rating, body, photos?: [photo ids]} → write or edit my review (one per card, up to 4 photos)
// DELETE /api/reviews?id=…                    → delete my review and its photos (admins: any review)
import { json, currentUser, getDb, isAdmin, readJson, cleanText, randomToken, HttpError } from '../../server/lib.js';
import { PHOTOS_PER_REVIEW, checkPhotoList, checkOwnPhotos, deletePhotosWhere, photoMeta, parseList } from '../../server/photos.js';

const ITEM = /^[a-z]:[a-z0-9_]{2,40}$/;
const PER_DAY = 20;

/* rows with a JSON `photos` column → the same rows with photos as [{id, w, h}] */
async function withPhotos(db, rows) {
  const lists = rows.map((r) => parseList(r.photos));
  const meta = await photoMeta(db, lists.flat());
  return rows.map((r, i) => ({ ...r, photos: lists[i].map((id) => meta[id]).filter(Boolean) }));
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const db = await getDb(context.env);
  const items = url.searchParams.get('items');
  if (url.searchParams.get('feed')) {
    const user = await currentUser(context);
    const list = items ? [...new Set(items.split(',').filter((s) => ITEM.test(s)))].slice(0, 90) : [];
    const before = Number(url.searchParams.get('before')) || Date.now() + 1;
    const limit = 15;
    const rows = await withPhotos(db, (await db.prepare(
      `SELECT r.id, r.item, r.rating, r.body, r.photos, r.created_at, r.updated_at, r.user_id, u.nickname FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.hidden = 0 AND r.created_at < ?${list.length ? ` AND r.item IN (${list.map(() => '?').join(',')})` : ''} ORDER BY r.created_at DESC LIMIT ?`
    ).bind(before, ...list, limit).all()).results || []);
    return json({
      reviews: rows.map((r) => ({ id: r.id, item: r.item, rating: r.rating, body: r.body, photos: r.photos, nickname: r.nickname, createdAt: r.created_at,
        edited: r.updated_at !== r.created_at, mine: !!user && r.user_id === user.id })),
      next: rows.length === limit ? rows[rows.length - 1].created_at : null,
    });
  }
  if (items != null) {
    const list = [...new Set(items.split(',').filter((s) => ITEM.test(s)))].slice(0, 60);
    const counts = {};
    if (list.length) {
      const rows = await db.prepare(`SELECT item, COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE hidden = 0 AND item IN (${list.map(() => '?').join(',')}) GROUP BY item`)
        .bind(...list).all();
      (rows.results || []).forEach((r) => { counts[r.item] = { n: r.n, avg: Math.round(r.avg * 10) / 10 }; });
    }
    return json({ counts });
  }
  const item = url.searchParams.get('item') || '';
  if (!ITEM.test(item)) throw new HttpError(400, 'bad_item');
  const user = await currentUser(context);
  const admin = isAdmin(context.env, user);
  const rows = await withPhotos(db, (await db.prepare(
    `SELECT r.id, r.rating, r.body, r.photos, r.created_at, r.updated_at, r.hidden, r.user_id, u.nickname FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.item = ? AND (r.hidden = 0 OR r.user_id = ? OR ?) ORDER BY r.created_at DESC LIMIT 100`
  ).bind(item, user ? user.id : '', admin ? 1 : 0).all()).results || []);
  const reviews = rows.map((r) => ({
    id: r.id, rating: r.rating, body: r.body, photos: r.photos, nickname: r.nickname, createdAt: r.created_at, edited: r.updated_at !== r.created_at,
    mine: !!user && r.user_id === user.id, hidden: !!r.hidden,
  }));
  const shown = reviews.filter((r) => !r.hidden);
  const avg = shown.length ? Math.round(shown.reduce((s, r) => s + r.rating, 0) / shown.length * 10) / 10 : null;
  return json({ reviews, count: shown.length, avg, canDelete: admin });
}

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const b = await readJson(context.request, 4096);
  const item = String(b.item || '');
  const rating = Number(b.rating);
  const body = cleanText(b.body, 500);
  const photos = checkPhotoList(b.photos || [], PHOTOS_PER_REVIEW);
  if (!ITEM.test(item)) throw new HttpError(400, 'bad_item');
  if (!(rating >= 1 && rating <= 5 && Math.round(rating) === rating)) throw new HttpError(400, 'bad_rating');
  if (body.length < 5) throw new HttpError(400, 'body_short');
  const db = await getDb(context.env);
  const now = Date.now();
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND updated_at > ?').bind(user.id, now - 864e5).first();
  if (recent && recent.n >= PER_DAY) throw new HttpError(429, 'too_many');
  const existing = await db.prepare('SELECT id FROM reviews WHERE item = ? AND user_id = ?').bind(item, user.id).first();
  const id = existing ? existing.id : randomToken(12);
  await checkOwnPhotos(db, user.id, photos, { reviewId: id });
  const stmts = [existing
    ? db.prepare('UPDATE reviews SET rating = ?, body = ?, photos = ?, updated_at = ? WHERE id = ?').bind(rating, body, JSON.stringify(photos), now, id)
    : db.prepare('INSERT INTO reviews (id, item, user_id, rating, body, photos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, item, user.id, rating, body, JSON.stringify(photos), now, now)];
  if (photos.length) stmts.push(db.prepare(`UPDATE photos SET review_id = ? WHERE id IN (${photos.map(() => '?').join(',')})`).bind(id, ...photos));
  await db.batch(stmts);
  if (existing) {
    const keep = photos.length ? ` AND id NOT IN (${photos.map(() => '?').join(',')})` : '';
    await deletePhotosWhere(context.env, db, 'review_id = ?' + keep, id, ...photos);
  }
  return json(existing ? { ok: true, id, edited: true } : { ok: true, id });
}

export async function onRequestDelete(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const id = new URL(context.request.url).searchParams.get('id') || '';
  const db = await getDb(context.env);
  const row = await db.prepare('SELECT user_id FROM reviews WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.user_id !== user.id && !isAdmin(context.env, user)) throw new HttpError(403, 'not_yours');
  await deletePhotosWhere(context.env, db, 'review_id = ?', id);
  await db.batch([
    db.prepare('DELETE FROM review_reports WHERE review_id = ?').bind(id),
    db.prepare('DELETE FROM reviews WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}
