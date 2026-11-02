// Bestätigung der eigenen Anmeldung (Double-Opt-in, L2/L4/L16).
// GET  ?token=…  (Links aus älteren E-Mails) → leitet nur zur Bestätigungsseite weiter, bestätigt NICHT.
// POST { t }     → bestätigt (Knopf auf /squadra-bestaetigen/). Link gilt 7 Tage.
// Der Token des Fans kann nie die Eltern-Bestätigung setzen; unter 16 bestätigen nur die Eltern (squadra-eltern).
import { handle, json, sb, siteUrl, readBody, HttpError, triggerBuild } from './_lib/common.mjs';
import { ERR, pickLang, langPrefix } from './_lib/texte.mjs';
import { tokenGueltig, elternErlaubt, istMinderjaehrig } from './_lib/squadra-rules.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

export default handle(async (req) => {
  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('token') || '';
    let lang = 'de';
    if (UUID.test(token)) {
      const row = (await sb(`/rest/v1/squadra_tre?token=eq.${token}&select=sprache`).catch(() => []))?.[0];
      if (row) lang = pickLang(row.sprache);
    }
    return Response.redirect(`${siteUrl()}${langPrefix(lang)}/squadra-bestaetigen/?t=${encodeURIComponent(token)}`, 303);
  }
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  const b = await readBody(req);
  const token = String(b.t || b.token || '');
  const lang = pickLang(b.lang);
  if (!UUID.test(token)) throw new HttpError(400, ERR[lang].link);
  const row = (await sb(`/rest/v1/squadra_tre?token=eq.${token}&select=*`))?.[0];
  if (!row || row.altersstufe === 'unter16') throw new HttpError(404, ERR[pickLang(row?.sprache || lang)].link);
  const sprache = pickLang(row.sprache);
  const fotoWartet = !!(row.foto_pfad && istMinderjaehrig(row) && !elternErlaubt(row, 'foto'));
  if (row.optin_bestaetigt) return json({ ok: true, schon: true, sprache, foto_wartet: fotoWartet });
  if (!tokenGueltig(row)) throw new HttpError(410, ERR[sprache].link);
  await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: { optin_bestaetigt: true, bestaetigt_am: new Date().toISOString() } });
  // Neue Namen auf der Wand: Website neu bauen lassen (optional, über Build-Hook)
  if (row.wand_optin || row.foto_pfad) await triggerBuild().catch(() => {});
  return json({ ok: true, sprache, foto_wartet: fotoWartet });
});

export const config = { path: '/api/squadra-confirm' };
