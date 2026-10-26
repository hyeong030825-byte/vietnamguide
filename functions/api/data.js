// GET /api/data → the logged-in user's saved bookmarks, notes, checklist and flashcard marks · PUT → save them
import { json, currentUser, getDb, readJson, HttpError } from '../../server/lib.js';

const MAX = 60000;
const id = (s) => typeof s === 'string' && s.length <= 80 && /^[a-z]:?[A-Za-z0-9_:-]+$/.test(s);
const flags = (o) => {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).slice(0, 500).forEach((k) => { if (id(k) && (o[k] === true || o[k] === 1 || typeof o[k] === 'string' && o[k].length <= 20)) out[k] = o[k]; });
  return out;
};
const text = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

/* keep only the shapes the page writes, so nothing else can be stored */
function sanitize(d) {
  d = d && typeof d === 'object' ? d : {};
  const notes = d.notes && typeof d.notes === 'object' ? d.notes : {};
  return {
    bookmarks: Array.isArray(d.bookmarks) ? [...new Set(d.bookmarks.filter(id))].slice(0, 500) : [],
    notes: { name: text(notes.name, 200), addr: text(notes.addr, 300), memo: text(notes.memo, 2000) },
    prepChecks: flags(d.prepChecks),
    deckMarks: flags(d.deckMarks),
  };
}

export async function onRequestGet(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const db = await getDb(context.env);
  const row = await db.prepare('SELECT data, updated_at FROM userdata WHERE user_id = ?').bind(user.id).first();
  return json({ data: row ? JSON.parse(row.data) : null, updatedAt: row ? row.updated_at : null });
}

export async function onRequestPut(context) {
  const user = await currentUser(context);
  if (!user) throw new HttpError(401, 'login_required');
  const body = await readJson(context.request, MAX + 1000);
  const data = JSON.stringify(sanitize(body.data));
  if (data.length > MAX) throw new HttpError(413, 'too_large');
  const now = Date.now();
  const db = await getDb(context.env);
  await db.prepare('INSERT INTO userdata (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
    .bind(user.id, data, now).run();
  return json({ ok: true, updatedAt: now });
}
