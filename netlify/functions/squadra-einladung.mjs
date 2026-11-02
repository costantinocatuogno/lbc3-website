// Team-Bereich: persönliche Instagram-Einladungen merken (wer wurde wann eingeladen, wer hat sich angemeldet).
import { handle, json, requireAdmin, readBody, HttpError } from './_lib/common.mjs';
import { liste, hinzufuegen, entfernen } from './_lib/einladungen.mjs';

export default handle(async (req) => {
  await requireAdmin(req);
  if (req.method === 'GET') return json({ einladungen: await liste() });
  const b = await readBody(req);
  if (req.method === 'POST') {
    const h = await hinzufuegen(b.handle, ['de', 'it', 'en', 'fr'].includes(b.sprache) ? b.sprache : 'de');
    if (!h) throw new HttpError(400, 'Bitte einen gültigen Instagram-Namen eingeben.');
    return json({ ok: true, handle: h });
  }
  if (req.method === 'DELETE') { await entfernen(b.handle); return json({ ok: true }); }
  throw new HttpError(405, 'Nicht erlaubt.');
});

export const config = { path: '/api/squadra-einladung' };
