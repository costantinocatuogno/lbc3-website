// Team-Bereich: Squadra-Wochenbericht sofort senden (zum Testen; sonst automatisch sonntags).
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';
import { wochenbericht } from './squadra-wochenbericht.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  await requireAdmin(req);
  const res = await wochenbericht();
  return json({ ok: true, info: await res.text() });
});

export const config = { path: '/api/squadra-wochenbericht' };
