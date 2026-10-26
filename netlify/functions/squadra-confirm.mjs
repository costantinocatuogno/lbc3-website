// Bestätigungslink aus der Double-Opt-in-E-Mail.
import { handle, sb, siteUrl, HttpError, triggerBuild } from './_lib/common.mjs';
import { ERR, pickLang, langPrefix } from './_lib/texte.mjs';

export default handle(async (req) => {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(400, 'Ungültiger Link.');
  const rows = await sb(`/rest/v1/squadra_tre?token=eq.${token}&select=id,sprache,wand_optin,optin_bestaetigt`);
  const row = rows?.[0];
  if (!row) throw new HttpError(404, `${ERR.de.link} / ${ERR.it.link} / ${ERR.en.link} / ${ERR.fr.link}`);
  if (!row.optin_bestaetigt) {
    await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: { optin_bestaetigt: true, bestaetigt_am: new Date().toISOString() } });
    // Neue Namen auf der Wand: Website neu bauen lassen (optional, über Build-Hook)
    if (row.wand_optin) await triggerBuild().catch(() => {});
  }
  return Response.redirect(`${siteUrl()}${langPrefix(pickLang(row.sprache))}/squadra-bestaetigt/`, 303);
});

export const config = { path: '/api/squadra-confirm' };
