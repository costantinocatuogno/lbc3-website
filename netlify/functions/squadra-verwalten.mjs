// „Daten ändern oder löschen“ (L9, L12) – mit dem langlebigen verwalten_token aus jeder E-Mail an Fans und Eltern.
// GET  ?t=…  → kurze Übersicht für /squadra-verwalten/ (Anzeigename, Foto ja/nein, auf der Wall ja/nein, E-Mails ja/nein)
// POST { t, aktion }  aktion = foto | wall | abmelden | austritt
//   foto     → nur das Foto löschen
//   wall     → von der Wall nehmen (Name aus, Foto gelöscht), Mitgliedschaft bleibt
//   abmelden → keine Renn-Updates und keinen Jahresbericht mehr
//   austritt → alles löschen (Zeile, Foto, Pin)
// Ein-Klick-Abmeldung aus dem Postfach (List-Unsubscribe-Post): POST ?t=…&aktion=abmelden
import { handle, json, sb, readBody, HttpError, triggerBuild, sbRemove } from './_lib/common.mjs';
import { ERR, pickLang } from './_lib/texte.mjs';
import { pinsEntfernen } from './_lib/squadra-store.mjs';
import { anzeigeName, wallEintrag } from './_lib/squadra-rules.mjs';

const UUID = /^[0-9a-f-]{36}$/i;
const AKTIONEN = ['foto', 'wall', 'abmelden', 'austritt'];


export default handle(async (req) => {
  const q = new URL(req.url).searchParams;
  if (req.method === 'GET') {
    const lang = pickLang(q.get('lang'));
    const t = q.get('t') || '';
    if (!UUID.test(t)) throw new HttpError(400, ERR[lang].link);
    const row = (await sb(`/rest/v1/squadra_tre?verwalten_token=eq.${t}&select=*`))?.[0];
    if (!row) throw new HttpError(404, ERR[lang].link);
    return json({
      ok: true, sprache: pickLang(row.sprache), name: anzeigeName(row),
      foto: !!row.foto_pfad, wall: !!wallEintrag(row) || !!row.wand_optin, mails: !!(row.updates_optin || row.jahresbericht_optin)
    });
  }
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  let b = {};
  try { b = await readBody(req); } catch { b = {}; }
  const lang = pickLang(b.lang);
  const t = String(b.t || q.get('t') || '');
  const aktion = String(b.aktion || q.get('aktion') || '');
  if (!UUID.test(t)) throw new HttpError(400, ERR[lang].link);
  if (!AKTIONEN.includes(aktion)) throw new HttpError(400, ERR[lang].action);
  const row = (await sb(`/rest/v1/squadra_tre?verwalten_token=eq.${t}&select=*`))?.[0];
  if (!row) throw new HttpError(404, ERR[lang].link);

  if (aktion === 'austritt') {
    if (row.foto_pfad) await sbRemove('squadra', row.foto_pfad);
    await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'DELETE' });
    await pinsEntfernen(row.id);
    await triggerBuild().catch(() => {});
    return json({ ok: true, aktion });
  }
  const patch = {};
  if (aktion === 'foto' || aktion === 'wall') {
    if (row.foto_pfad) await sbRemove('squadra', row.foto_pfad);
    patch.foto_pfad = null; patch.foto_freigegeben = false;
  }
  if (aktion === 'wall') patch.wand_optin = false;
  if (aktion === 'abmelden') { patch.updates_optin = false; patch.jahresbericht_optin = false; }
  await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: patch });
  if (aktion !== 'abmelden') { if (aktion === 'wall') await pinsEntfernen(row.id); await triggerBuild().catch(() => {}); }
  return json({ ok: true, aktion });
});

export const config = { path: '/api/squadra-verwalten' };
