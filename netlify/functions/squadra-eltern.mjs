// Eltern-Bestätigung (L1, L2, L4, L16) – nur mit dem eigenen eltern_token aus der Eltern-E-Mail (7 Tage gültig).
// GET  ?t=…         → Übersicht für /squadra-eltern/: Anzeigename, Spitzname, angebotene Zwecke (vorbelegt mit der Wahl des Kindes);
//                     bei abgelaufenem Link nur { ok: true, gueltig: false }
// GET  ?t=…&foto=1  → das private Foto (nur für einen gültigen, nicht abgelaufenen eltern_token)
// POST { t, zwecke: { mitglied, wall_name, foto, updates, jahresbericht }, sorgeberechtigt } → speichert die Zustimmung
import { handle, json, sb, env, keyHeaders, readBody, HttpError, triggerBuild, sbRemove } from './_lib/common.mjs';
import { ERR, pickLang } from './_lib/texte.mjs';
import { pinsEntfernen } from './_lib/squadra-store.mjs';
import { tokenGueltig, elternUebersicht, pruefeElternAntwort, brauchtElternFuerMitgliedschaft, EINWILLIGUNG_VERSION } from './_lib/squadra-rules.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

async function zeileZu(token, lang) {
  if (!UUID.test(token)) throw new HttpError(400, ERR[lang].link);
  const row = (await sb(`/rest/v1/squadra_tre?eltern_token=eq.${token}&select=*`))?.[0];
  if (!row) throw new HttpError(404, ERR[lang].link);
  return row;
}


export default handle(async (req) => {
  const q = new URL(req.url).searchParams;
  if (req.method === 'GET') {
    const lang = pickLang(q.get('lang'));
    const row = await zeileZu(q.get('t') || '', lang);
    const gueltig = tokenGueltig(row);
    if (q.get('foto')) {
      if (!gueltig || !row.foto_pfad) throw new HttpError(404, ERR[lang].link);
      const res = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/squadra/${row.foto_pfad}`, { headers: keyHeaders(env('SUPABASE_SERVICE_ROLE_KEY')) });
      if (!res.ok) throw new HttpError(404, ERR[lang].link);
      return new Response(res.body, { headers: { 'Content-Type': res.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    const u = elternUebersicht(row);
    if (u.gueltig) u.sprache = pickLang(u.sprache); // abgelaufen: nur { ok, gueltig: false }
    return json(u);
  }
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  const b = await readBody(req);
  const lang = pickLang(b.lang);
  const row = await zeileZu(String(b.t || ''), lang);
  const E = ERR[pickLang(row.sprache || lang)];
  if (!tokenGueltig(row)) throw new HttpError(410, E.link);
  const antwort = pruefeElternAntwort(row, b);
  if (antwort.error) throw new HttpError(400, E[antwort.error] || E.link);
  const { zwecke } = antwort;
  const jetzt = new Date().toISOString();

  // Unter 16 und Mitgliedschaft abgelehnt → Anmeldung samt Foto löschen
  if (brauchtElternFuerMitgliedschaft(row) && !zwecke.mitglied) {
    if (row.foto_pfad) await sbRemove('squadra', row.foto_pfad);
    await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'DELETE' });
    await pinsEntfernen(row.id);
    await triggerBuild().catch(() => {});
    return json({ ok: true, geloescht: true });
  }

  const patch = { eltern_bestaetigt_am: jetzt, eltern_zwecke: zwecke, einwilligung_version: EINWILLIGUNG_VERSION };
  if (brauchtElternFuerMitgliedschaft(row)) {
    // Unter 16: die Zustimmung der Eltern ist das Opt-in (das Kind bestätigt nicht selbst)
    patch.optin_bestaetigt = true;
    if (!row.bestaetigt_am) patch.bestaetigt_am = jetzt;
    patch.updates_optin = !!(row.updates_optin && zwecke.updates);
    patch.jahresbericht_optin = !!(row.jahresbericht_optin && zwecke.jahresbericht);
    patch.wand_optin = !!(row.wand_optin && zwecke.wall_name);
  }
  // Foto nicht erlaubt → sofort löschen
  if (row.foto_pfad && !zwecke.foto) { await sbRemove('squadra', row.foto_pfad); patch.foto_pfad = null; patch.foto_freigegeben = false; }
  await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: patch });
  await triggerBuild().catch(() => {});
  return json({ ok: true, zwecke });
});

export const config = { path: '/api/squadra-eltern' };
