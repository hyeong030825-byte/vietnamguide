// 여행기 (trip stories): anyone can read, members write.
// GET    /api/stories?city=&before=&limit=   → newest first, short excerpt and cover photo
// GET    /api/stories?id=…                   → one 여행기 in full
// POST   /api/stories {city, trip, rating, title, body, photos: [photo ids]}
// PUT    /api/stories?id=… (same body)       → edit my 여행기; photos left out of the list are deleted
// DELETE /api/stories?id=…                   → delete mine (admins: any) with its photos and comments
import { json, currentUser, getDb, isAdmin, readJson, cleanText, randomToken, CITY_IDS, HttpError } from '../../server/lib.js';
import { checkPhotoList, checkOwnPhotos, deletePhotosWhere } from '../../server/photos.js';

const PER_DAY = 5;
const TITLE_MAX = 60, BODY_MIN = 20, BODY_MAX = 3000;

function photoInfo(rows, ids) {
  const byId = {};
  rows.forEach((p) => { byId[p.id] = { id: p.id, w: p.width, h: p.height }; });
  return ids.map((id) => byId[id]).filter(Boolean);
}
async function photosOf(db, list) {
  const ids = [...new Set(list.flat())];
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const r = await db.prepare(`SELECT id, width, height FROM photos WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all();
    out.push(...(r.results || []));
  }
  return out;
}
const parse = (s) => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const db = await getDb(context.env);
  const user = await currentUser(context);
  const admin = isAdmin(context.env, user);
  const uid = user ? user.id : '';

  const id = url.searchParams.get('id');
  if (id) {
    const s = await db.prepare(
      `SELECT s.*, u.nickname FROM stories s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND (s.hidden = 0 OR s.user_id = ? OR ?)`
    ).bind(id, uid, admin ? 1 : 0).first();
    if (!s) throw new HttpError(404, 'not_found');
    const ids = parse(s.photos);
    return json({
      story: {
        id: s.id, city: s.city, trip: s.trip, rating: s.rating, title: s.title, body: s.body, nickname: s.nickname,
        createdAt: s.created_at, edited: s.updated_at !== s.created_at, mine: s.user_id === uid, hidden: !!s.hidden,
        photos: photoInfo(await photosOf(db, [ids]), ids),
      },
      canDelete: admin || s.user_id === uid,
    });
  }

  const city = url.searchParams.get('city') || '';
  const before = Number(url.searchParams.get('before')) || Date.now() + 1;
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const where = ['s.created_at < ?', '(s.hidden = 0 OR s.user_id = ? OR ?)'];
  const args = [before, uid, admin ? 1 : 0];
  if (city) {
    if (!CITY_IDS.includes(city)) throw new HttpError(400, 'bad_city');
    where.push('s.city = ?'); args.push(city);
  }
  const rows = (await db.prepare(
    `SELECT s.id, s.city, s.trip, s.rating, s.title, substr(s.body, 1, 200) AS excerpt, length(s.body) AS len, s.photos, s.created_at,
            s.updated_at, s.hidden, s.user_id, u.nickname, (SELECT COUNT(*) FROM comments c WHERE c.story_id = s.id AND c.hidden = 0) AS comments
     FROM stories s JOIN users u ON u.id = s.user_id WHERE ${where.join(' AND ')} ORDER BY s.created_at DESC LIMIT ?`
  ).bind(...args, limit).all()).results || [];
  const lists = rows.map((r) => parse(r.photos));
  const info = await photosOf(db, lists.map((l) => l.slice(0, 1)));
  const stories = rows.map((r, i) => ({
    id: r.id, city: r.city, trip: r.trip, rating: r.rating, title: r.title, excerpt: r.excerpt, more: r.len > 200,
    cover: photoInfo(info, lists[i].slice(0, 1))[0] || null, photoCount: lists[i].length, comments: r.comments, nickname: r.nickname,
    createdAt: r.created_at, edited: r.updated_at !== r.created_at, mine: r.user_id === uid, hidden: !!r.hidden,
  }));
  return json({ stories, next: rows.length === limit ? rows[rows.length - 1].created_at : null });
}

async function readStory(request) {
  const b = await readJson(request, 16384);
  const city = String(b.city || '');
  const trip = String(b.trip || '');
  const rating = Number(b.rating);
  const title = cleanText(b.title, TITLE_MAX).replace(/\n/g, ' ');
  const body = cleanText(b.body, BODY_MAX);
  if (!CITY_IDS.includes(city)) throw new HttpError(400, 'bad_city');
  if (trip && !/^20\d\d-(0[1-9]|1[0-2])$/.test(trip)) throw new HttpError(400, 'bad_trip');
  if (!(rating >= 1 && rating <= 5 && Math.round(rating) === rating)) throw new HttpError(400, 'bad_rating');
  if (title.length < 2) throw new HttpError(400, 'title_short');
  if (body.length < BODY_MIN) throw new HttpError(400, 'body_short');
  return { city, trip, rating, title, body, photos: checkPhotoList(b.photos || []) };
}

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const s = await readStory(context.request);
  const db = await getDb(context.env);
  const now = Date.now();
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM stories WHERE user_id = ? AND created_at > ?').bind(user.id, now - 864e5).first();
  if (recent && recent.n >= PER_DAY) throw new HttpError(429, 'too_many');
  const id = randomToken(12);
  await checkOwnPhotos(db, user.id, s.photos, { storyId: id });
  const stmts = [db.prepare('INSERT INTO stories (id, user_id, city, trip, rating, title, body, photos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, s.city, s.trip, s.rating, s.title, s.body, JSON.stringify(s.photos), now, now)];
  if (s.photos.length) stmts.push(db.prepare(`UPDATE photos SET story_id = ? WHERE id IN (${s.photos.map(() => '?').join(',')})`).bind(id, ...s.photos));
  await db.batch(stmts);
  return json({ ok: true, id });
}

async function ownStory(context, user) {
  const id = new URL(context.request.url).searchParams.get('id') || '';
  const db = await getDb(context.env);
  const row = await db.prepare('SELECT id, user_id FROM stories WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  return { db, row };
}

export async function onRequestPut(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const { db, row } = await ownStory(context, user);
  if (row.user_id !== user.id) throw new HttpError(403, 'not_yours');
  const s = await readStory(context.request);
  await checkOwnPhotos(db, user.id, s.photos, { storyId: row.id });
  const stmts = [db.prepare('UPDATE stories SET city = ?, trip = ?, rating = ?, title = ?, body = ?, photos = ?, updated_at = ? WHERE id = ?')
    .bind(s.city, s.trip, s.rating, s.title, s.body, JSON.stringify(s.photos), Date.now(), row.id)];
  if (s.photos.length) stmts.push(db.prepare(`UPDATE photos SET story_id = ? WHERE id IN (${s.photos.map(() => '?').join(',')})`).bind(row.id, ...s.photos));
  await db.batch(stmts);
  const keep = s.photos.length ? ` AND id NOT IN (${s.photos.map(() => '?').join(',')})` : '';
  await deletePhotosWhere(context.env, db, 'story_id = ?' + keep, row.id, ...s.photos);
  return json({ ok: true, id: row.id });
}

export async function onRequestDelete(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const { db, row } = await ownStory(context, user);
  if (row.user_id !== user.id && !isAdmin(context.env, user)) throw new HttpError(403, 'not_yours');
  await deletePhotosWhere(context.env, db, 'story_id = ?', row.id);
  await db.batch([
    db.prepare('DELETE FROM comment_reports WHERE comment_id IN (SELECT id FROM comments WHERE story_id = ?)').bind(row.id),
    db.prepare('DELETE FROM comments WHERE story_id = ?').bind(row.id),
    db.prepare('DELETE FROM story_reports WHERE story_id = ?').bind(row.id),
    db.prepare('DELETE FROM stories WHERE id = ?').bind(row.id),
  ]);
  return json({ ok: true });
}
