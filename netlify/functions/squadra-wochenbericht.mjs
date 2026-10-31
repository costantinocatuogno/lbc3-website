// Jeden Sonntagmorgen: Wochenbericht über neue Squadra-Tre-Mitglieder + fertiger Text für den Instagram-Post.
// Empfänger stehen in der Netlify-Umgebungsvariable SQUADRA_REPORT_TO (Komma-getrennt), nicht im öffentlichen Repository.
// Schutz: Im Post-Text erscheinen nur Mitglieder, die der Nennung auf der Wall zugestimmt haben (Vorname + Initiale);
// Instagram-Namen nur von volljährigen Mitgliedern mit dieser Zustimmung. Keine E-Mail-Adressen, keine Beträge im Bericht.
import { sb, sendMail, mailLayout, escapeHtml, siteUrl, kurzName, cleanHandle } from './_lib/common.mjs';

const TAGE = 7;
const ART = { freund: 'Freund', unterstuetzer: 'Unterstützer' };
const SPRACHE = { de: 'Deutsch', it: 'Italienisch', en: 'Englisch', fr: 'Französisch' };

function aufzaehlen(namen, rest, w) {
  const teile = [...namen];
  if (rest > 0) teile.push(w.weitere(rest));
  if (teile.length <= 1) return teile.join('');
  return `${teile.slice(0, -1).join(', ')} ${w.und} ${teile[teile.length - 1]}`;
}

// Post-Texte in drei Sprachen; die Variante wechselt jede Woche, damit sich die Posts nicht wiederholen
function postTexte(genannt, handles, anzahl, woche) {
  const tags = '#LBC3 #SquadraTre #ForzaLuigi #Kartsport #Karting';
  const W = {
    de: { und: 'und', weitere: (n) => `${n} weitere${n === 1 ? 'r Fan' : ' Fans'}` },
    it: { und: 'e', weitere: (n) => `altri ${n} tifos${n === 1 ? 'o' : 'i'}` },
    en: { und: 'and', weitere: (n) => `${n} more fan${n === 1 ? '' : 's'}` }
  };
  const wer = (l) => aufzaehlen(genannt, anzahl - genannt.length, W[l]);
  const at = handles.length ? `\n\n${handles.map((h) => `@${h}`).join(' ')}` : '';
  if (!anzahl) {
    const v = [
      { de: 'Die Squadra Tre wächst – und es ist noch Platz für dich! 🏁 Werde Teil von Luigis Fan-Team, sei bei jedem Rennwochenende dabei und erfahre als Erstes, wie es läuft. Link in der Bio 🔗', it: 'La Squadra Tre cresce – e c’è ancora posto per te! 🏁 Entra nel fan team di Luigi, vivi ogni weekend di gara con noi e scopri per primo come va. Link in bio 🔗', en: 'The Squadra Tre is growing – and there’s still room for you! 🏁 Join Luigi’s fan team, be part of every race weekend and be the first to hear how it went. Link in bio 🔗' },
      { de: 'Hinter jeder Runde steht ein Team. 💪 Mit der Squadra Tre fährst du mit – kostenlos als Freund oder als Unterstützer. Alle Infos über den Link in der Bio.', it: 'Dietro ogni giro c’è una squadra. 💪 Con la Squadra Tre corri anche tu – gratis come amico o come sostenitore. Tutte le info nel link in bio.', en: 'Behind every lap there’s a team. 💪 With the Squadra Tre you’re part of the ride – free as a friend or as a supporter. All the details via the link in bio.' }
    ][woche % 2];
    return { de: `${v.de}\n\n${tags}`, it: `${v.it}\n\n${tags}`, en: `${v.en}\n\n${tags}` };
  }
  const v = [
    { de: `Benvenuti in der Squadra Tre! 🇩🇪🇮🇹 Diese Woche neu dabei: ${wer('de')}. Danke, dass ihr Luigi #3 auf seinem Weg begleitet – wir sehen uns an der Strecke! 🏁`, it: `Benvenuti nella Squadra Tre! 🇮🇹🇩🇪 Questa settimana si sono uniti: ${wer('it')}. Grazie per accompagnare Luigi #3 nel suo percorso – ci vediamo in pista! 🏁`, en: `Welcome to the Squadra Tre! 🇩🇪🇮🇹 New this week: ${wer('en')}. Thank you for joining Luigi #3 on his journey – see you at the track! 🏁` },
    { de: `Die Squadra Tre wird größer! 💪 Ein großes Grazie an ${wer('de')} – schön, dass ihr dabei seid. Zusammen geht’s Runde für Runde nach vorn. 🏎️`, it: `La Squadra Tre cresce! 💪 Un grande grazie a ${wer('it')} – che bello avervi con noi. Insieme, giro dopo giro, sempre avanti. 🏎️`, en: `The Squadra Tre keeps growing! 💪 A big grazie to ${wer('en')} – great to have you on board. Together, lap by lap, onwards. 🏎️` }
  ][woche % 2];
  const end = { de: '\n\nAuch dabei sein? Link in der Bio 🔗', it: '\n\nVuoi esserci anche tu? Link in bio 🔗', en: '\n\nWant to join? Link in bio 🔗' };
  return Object.fromEntries(['de', 'it', 'en'].map((l) => [l, `${v[l]}${at}${end[l]}\n\n${tags}`]));
}

export async function wochenbericht() {
  const empfaenger = String(process.env.SQUADRA_REPORT_TO || process.env.MAIL_REPLY_TO || '').split(',').map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
  if (!empfaenger.length) return new Response('Keine Empfänger (SQUADRA_REPORT_TO)');
  const seit = new Date(Date.now() - TAGE * 24 * 3600 * 1000).toISOString();
  const felder = 'name,angezeigter_name,mitgliedschaft,sprache,wand_optin,minderjaehrig,instagram,ausgeblendet,bestaetigt_am,created_at';
  const neu = await sb(`/rest/v1/squadra_tre?select=${felder}&optin_bestaetigt=eq.true&bestaetigt_am=gte.${encodeURIComponent(seit)}&order=bestaetigt_am.asc`);
  const offen = await sb(`/rest/v1/squadra_tre?select=id&optin_bestaetigt=eq.false&created_at=gte.${encodeURIComponent(seit)}`);
  const gesamt = await sb('/rest/v1/squadra_tre?select=id&optin_bestaetigt=eq.true');

  const nennbar = neu.filter((r) => r.wand_optin && !r.ausgeblendet);
  const genannt = nennbar.map((r) => r.angezeigter_name || kurzName(r.name)).filter(Boolean);
  const handles = nennbar.filter((r) => !r.minderjaehrig).map((r) => cleanHandle(r.instagram)).filter(Boolean);
  const woche = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const texte = postTexte(genannt, handles, neu.length, woche);

  const datum = (d) => new Date(d).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
  const zeilen = neu.map((r) => `<tr>
    <td style="padding:6px 8px 6px 0;border-bottom:1px solid #ECEDEF"><strong>${escapeHtml(r.name)}</strong>${r.minderjaehrig ? ' <span style="color:#C8102E">(minderjährig)</span>' : ''}</td>
    <td style="padding:6px 8px 6px 0;border-bottom:1px solid #ECEDEF">${escapeHtml(ART[r.mitgliedschaft] || r.mitgliedschaft || '')}</td>
    <td style="padding:6px 8px 6px 0;border-bottom:1px solid #ECEDEF">${escapeHtml(SPRACHE[r.sprache] || r.sprache || '')}</td>
    <td style="padding:6px 0;border-bottom:1px solid #ECEDEF">${r.wand_optin && !r.ausgeblendet ? `✔ als „${escapeHtml(r.angezeigter_name || kurzName(r.name))}“${!r.minderjaehrig && cleanHandle(r.instagram) ? ` · @${escapeHtml(cleanHandle(r.instagram))}` : ''}` : '✖ nicht nennen'}</td>
  </tr>`).join('');
  const box = (titel, text) => `<p style="margin:18px 0 6px;font-weight:bold">${titel}</p>
    <div style="white-space:pre-wrap;background:#F2F3F5;border-left:4px solid #C8102E;padding:12px 14px;font-size:15px">${escapeHtml(text)}</div>`;

  const inner = `
    <p><strong>${neu.length}</strong> neue${neu.length === 1 ? 's Mitglied' : ' Mitglieder'} in den letzten 7 Tagen (bestätigt) · Squadra Tre gesamt: <strong>${gesamt.length}</strong>${offen.length ? ` · ${offen.length} Anmeldung${offen.length === 1 ? '' : 'en'} noch nicht per E-Mail bestätigt` : ''}</p>
    ${neu.length ? `<table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><th align="left">Name</th><th align="left">Art</th><th align="left">Sprache</th><th align="left">Im Post nennen?</th></tr>${zeilen}</table>
      <p style="font-size:13px;color:#555A63">Genannt werden nur Mitglieder, die der Nennung auf der Wall zugestimmt haben – mit Vorname und Initiale. Instagram-Namen nur von Volljährigen. Bei Fotos von Kindern im Post bitte nur mit Einverständnis der Eltern.</p>`
      : '<p>Diese Woche keine neuen Mitglieder – hier ein Text, um neue Fans einzuladen.</p>'}
    <h2 style="font-size:19px;margin:26px 0 4px">Text für den Instagram-Post</h2>
    <p style="font-size:13px;color:#555A63;margin:0">Zum Kopieren gedrückt halten. Vor dem Posten kurz lesen.</p>
    ${box('Deutsch', texte.de)}${box('Italiano', texte.it)}${box('English', texte.en)}
    <p style="margin-top:24px"><a href="${escapeHtml(siteUrl())}/team/" style="color:#C8102E">Alle Mitglieder im Team-Bereich ansehen →</a></p>`;

  await sendMail({
    to: empfaenger.map((email) => ({ email })),
    subject: `Squadra Tre · Wochenbericht ${datum(seit)}–${datum(new Date())}: ${neu.length} neu`,
    html: mailLayout('Squadra Tre – Wochenbericht', inner)
  });
  return new Response(`Gesendet an ${empfaenger.length} Empfänger: ${neu.length} neu`);
}

export default () => wochenbericht();

// Sonntags 07:00 UTC = 08:00 Uhr Winterzeit / 09:00 Uhr Sommerzeit
export const config = { schedule: '0 7 * * 0' };
export { postTexte };
