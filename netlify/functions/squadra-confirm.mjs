// Bestätigungslink aus der Double-Opt-in-E-Mail.
import { handle, sb, siteUrl, HttpError, triggerBuild } from './_lib/common.mjs';

export default handle(async (req) => {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(400, 'Ungültiger Link.');
  const rows = await sb(`/rest/v1/squadra_tre?token=eq.${token}&select=id,sprache,wand_optin,optin_bestaetigt`);
  const row = rows?.[0];
  if (!row) throw new HttpError(404, 'Dieser Link ist ungültig oder abgelaufen.');
  if (!row.optin_bestaetigt) {
    await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: { optin_bestaetigt: true, bestaetigt_am: new Date().toISOString() } });
    // Neue Namen auf der Wand: Website neu bauen lassen (optional, über Build-Hook)
    if (row.wand_optin) await triggerBuild().catch(() => {});
  }
  const prefix = row.sprache && row.sprache !== 'de' ? `/${row.sprache}` : '';
  return Response.redirect(`${siteUrl()}${prefix}/squadra-bestaetigt/`, 303);
});

export const config = { path: '/api/squadra-confirm' };
