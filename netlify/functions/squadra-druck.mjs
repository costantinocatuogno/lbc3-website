// Druckansicht der Wall of Fame (L15) – nur für Admins. Die statische Seite /wall-of-fame/druck/ enthält keine Namen
// und keine Fotos; sie lädt die Daten nach dem Login von hier. Fotos/Logos als kurzlebige signierte Links (1 Stunde).
// Gleiche Auswahl wie die öffentliche Wall (oeffentlicheWall) und gleiche Reihenfolge (Pins zuerst).
import { handle, json, sb, env, requireAdmin, HttpError } from './_lib/common.mjs';
import { oeffentlicheWall, wallOrder } from './_lib/squadra-rules.mjs';
import { pinsLesen } from './_lib/squadra-store.mjs';

async function signiert(bucket, pfad) {
  if (!pfad) return null;
  try {
    const s = await sb(`/storage/v1/object/sign/${bucket}/${pfad}`, { method: 'POST', body: { expiresIn: 3600 } });
    const u = s.signedURL || s.signedUrl;
    return u ? `${env('SUPABASE_URL')}/storage/v1${u}` : null;
  } catch { return null; }
}

export default handle(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Nur GET.');
  await requireAdmin(req);
  const rows = await sb('/rest/v1/squadra_tre?select=*&order=created_at.asc');
  const liste = [];
  for (const m of oeffentlicheWall(rows)) liste.push({ id: m.id, seit: m.seit, name: m.name, unterstuetzer: m.unterstuetzer, foto: await signiert('squadra', m.foto_pfad) });
  const mitglieder = wallOrder(liste, await pinsLesen());
  const sp = await sb('/rest/v1/sponsor_wall?select=firma,website,logo_pfad&freigegeben=eq.true&order=created_at.asc');
  const sponsoren = [];
  for (const s of sp) sponsoren.push({ firma: s.firma, website: s.website, logo: await signiert('sponsoren', s.logo_pfad) });
  return json({ ok: true, mitglieder, sponsoren });
});

export const config = { path: '/api/squadra-druck' };
