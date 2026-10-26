// Photos for 여행기. The page shrinks each photo to at most 1280 px and re-encodes it (JPEG or WebP), which drops
// the camera's EXIF data such as GPS location; the server strips any EXIF/XMP/IPTC block that is still there, so a
// stored photo never says where or when it was taken.
// Storage: an R2 bucket bound as PHOTOS ("photos" also works) when there is one, otherwise base64 text in D1, split into
// 90 KB pieces because a D1 statement may be at most 100 KB (all pieces go in one batch, which D1 counts as one query).
import { HttpError } from './lib.js';

export const PHOTO_MAX_BYTES = 1200000;   // after the page's resize a photo is usually 150–400 KB
export const PHOTOS_PER_STORY = 6;
export const UPLOADS_PER_DAY = 40;
const PART_CHARS = 90000;                 // base64 characters per D1 row (a multiple of 4, so pieces join cleanly)

export function photoBucket(env) {
  return (env && (env.PHOTOS || env.photos)) || null;
}

/* "image/jpeg" | "image/webp" | null, from the file's first bytes */
export function sniffType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 16 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}
const ascii = (b, at, n) => String.fromCharCode(...b.subarray(at, at + n));

/* the same image without EXIF / XMP / IPTC metadata (location, camera, time); null if the file is broken or animated */
export function stripMetadata(b, type) {
  if (type === 'image/jpeg') {
    const keep = [b.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i += 1; continue; }                        // fill byte
      if (m === 0xda) { keep.push(b.subarray(i)); return join(keep); } // image data to the end
      if (m === 0xd9) return null;
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2 || i + 2 + len > b.length) return null;
      if (m !== 0xe1 && m !== 0xed && m !== 0xfe) keep.push(b.subarray(i, i + 2 + len)); // drop APP1 (EXIF/XMP), APP13 (IPTC), comments
      i += 2 + len;
    }
    return null;
  }
  if (type === 'image/webp') {
    const keep = [];
    let i = 12, vp8x = -1;
    while (i + 8 <= b.length) {
      const id = ascii(b, i, 4);
      const size = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16)) + b[i + 7] * 16777216;
      const end = i + 8 + size + (size & 1);
      if (end > b.length + 1) return null;
      if (id === 'ANIM' || id === 'ANMF') return null;
      if (id !== 'EXIF' && id !== 'XMP ') {
        if (id === 'VP8X') vp8x = keep.reduce((n, c) => n + c.length, 12);
        keep.push(b.subarray(i, Math.min(end, b.length)));
      }
      i = end;
    }
    const out = join([b.subarray(0, 12), ...keep]);
    const riff = out.length - 8;
    out[4] = riff & 255; out[5] = (riff >> 8) & 255; out[6] = (riff >> 16) & 255; out[7] = (riff >>> 24) & 255;
    if (vp8x >= 0) out[vp8x + 8] &= ~0x0c;                          // clear the EXIF / XMP flags
    return out;
  }
  return null;
}
function join(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(text) {
  const s = atob(text), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function savePhoto(env, db, { id, userId, bytes, type, width, height }) {
  const bucket = photoBucket(env);
  const now = Date.now();
  const row = db.prepare('INSERT INTO photos (id, user_id, story_id, store, type, size, width, height, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)')
    .bind(id, userId, bucket ? 'r2' : 'd1', type, bytes.length, width, height, now);
  if (bucket) {
    await bucket.put('p/' + id, bytes, { httpMetadata: { contentType: type } });
    await row.run();
  } else {
    const text = toBase64(bytes), parts = [];
    for (let i = 0, n = 0; i < text.length; i += PART_CHARS, n++) {
      parts.push(db.prepare('INSERT INTO photo_parts (id, part, data) VALUES (?, ?, ?)').bind(id, n, text.slice(i, i + PART_CHARS)));
    }
    await db.batch([row, ...parts]);
  }
}

export async function readPhoto(env, db, meta) {
  if (meta.store === 'r2') {
    const bucket = photoBucket(env);
    const obj = bucket && await bucket.get('p/' + meta.id);
    return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
  }
  const parts = (await db.prepare('SELECT data FROM photo_parts WHERE id = ? ORDER BY part').bind(meta.id).all()).results || [];
  return parts.length ? fromBase64(parts.map((p) => p.data).join('')) : null;
}

/* delete photo rows (and their files) matching a WHERE clause, e.g. 'story_id = ?' */
export async function deletePhotosWhere(env, db, where, ...args) {
  const rows = (await db.prepare(`SELECT id, store FROM photos WHERE ${where}`).bind(...args).all()).results || [];
  if (!rows.length) return 0;
  const r2 = rows.filter((r) => r.store === 'r2').map((r) => 'p/' + r.id);
  const bucket = photoBucket(env);
  if (r2.length && bucket) await bucket.delete(r2);
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50), q = chunk.map(() => '?').join(',');
    await db.batch([
      db.prepare(`DELETE FROM photo_parts WHERE id IN (${q})`).bind(...chunk),
      db.prepare(`DELETE FROM photos WHERE id IN (${q})`).bind(...chunk),
    ]);
  }
  return ids.length;
}

/* photos uploaded for a 여행기 that was never posted are removed after a day */
export function cleanOrphans(env, db) {
  return deletePhotosWhere(env, db, 'story_id IS NULL AND created_at < ? LIMIT 20', Date.now() - 864e5);
}

export function checkPhotoList(list) {
  if (!Array.isArray(list) || list.length > PHOTOS_PER_STORY || list.some((x) => typeof x !== 'string' || !/^[\w-]{8,40}$/.test(x))) {
    throw new HttpError(400, 'bad_photos');
  }
  return [...new Set(list)];
}
