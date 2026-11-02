// Squadra Tre – angepinnte Mitglieder (Wunsch 01.11.2026: „Pin“ = immer ganz vorne auf der Wall und oben in der Druckansicht).
// GET: Liste der angepinnten Mitglieds-IDs in Pin-Reihenfolge (nur IDs, keine Namen – liest der Website-Build).
// POST (nur Admin): { ids: [...] } speichern. Ablage in Netlify Blobs, keine Datenbank-Änderung nötig.
import { getStore } from '@netlify/blobs';
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';

const store = () => getStore('squadra');
const UUID = /^[0-9a-f-]{36}$/i;

export default handle(async (req) => {
  if (req.method === 'GET') return json({ ids: (await store().get('pins', { type: 'json' })) || [] });
  if (req.method !== 'POST') throw new HttpError(405, 'Nur GET oder POST.');
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((x) => UUID.test(String(x))))].slice(0, 50) : null;
  if (!ids) throw new HttpError(400, 'Liste fehlt.');
  await store().setJSON('pins', ids);
  return json({ ok: true, ids });
});

export const config = { path: '/api/squadra-pins' };
