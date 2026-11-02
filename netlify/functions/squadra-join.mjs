// Beitritt zur Squadra Tre (kostenlos als Freund/Fan oder – ab 18 – als Unterstützer mit Beitrag).
// Nimmt Formular-Daten inkl. optionalem Foto entgegen, entfernt Foto-Metadaten, speichert alles privat und
// schickt die Bestätigungs-E-Mails: unter 16 an die Eltern (Link zur Eltern-Seite), sonst an den Fan selbst.
// Nichts wird öffentlich, bevor bestätigt wurde UND das Team das Foto (bzw. Einwortnamen/Spitznamen) freigegeben hat.
// Regeln: _lib/squadra-rules.mjs · Schutz vor Missbrauch: max. 3 Anmeldungen je E-Mail/Tag und 10 je IP/Stunde (L13).
import { createHash } from 'node:crypto';
import { handle, json, sb, sbUpload, siteUrl, readBody, HttpError, looksLikeBot, stripMetadata, BildFehler, sbRemove } from './_lib/common.mjs';
import { ERR, pickLang, langPrefix } from './_lib/texte.mjs';
import { pruefeAnmeldung, bildTyp, doppelteAnmeldung } from './_lib/squadra-rules.mjs';
import { pinsEntfernen, getStore } from './_lib/squadra-store.mjs';
import { sendeElternMail, sendeFanMail, sendeSchonDabeiMail } from './_lib/squadra-mail.mjs';

const MAX_FOTO = 5 * 1024 * 1024;
const LIMIT_MAIL_TAG = 3;
const LIMIT_IP_STUNDE = 10;
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 32); // keine E-Mail/IP im Klartext ablegen

// Zähler in Netlify Blobs (wie bei den Pins). Schlüssel enthalten Tag bzw. Stunde – das Aufräumen übernimmt squadra-cleanup.
async function zaehle(key, limit) {
  try {
    const store = await getStore('squadra-limit');
    const n = Number((await store.get(key)) || 0);
    if (n >= limit) return false;
    await store.set(key, String(n + 1));
    return true;
  } catch (err) {
    console.warn('Rate-Limit nicht verfügbar:', err.message); // Anmeldung nie wegen des Zählers scheitern lassen
    return true;
  }
}

export default handle(async (req, context) => {
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  const b = await readBody(req);
  const lang = pickLang(b.lang);
  const E = ERR[lang];
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  const fertig = (extra = {}) => (wantsJson ? json({ ok: true, ...extra }) : Response.redirect(`${siteUrl()}${langPrefix(lang)}/squadra-tre/?beitritt=ok#beitreten`, 303));
  if (b.website || looksLikeBot(b)) return fertig(); // Bots still ignorieren (Honeypot + Zeitstempel)

  const fotoDatei = b.foto && typeof b.foto === 'object' && b.foto.size > 0 ? b.foto : null;
  const geprueft = pruefeAnmeldung({ ...b, sprache: lang }, { foto: !!fotoDatei });
  if (geprueft.error) throw new HttpError(400, E[geprueft.error] || E.name_mail);
  const { row, stufe } = geprueft;

  // Foto (optional) prüfen und Metadaten entfernen (L5) – Typ wird am Inhalt erkannt, nicht nur am Dateinamen
  let foto = null;
  if (fotoDatei) {
    if (fotoDatei.size > MAX_FOTO) throw new HttpError(400, E.photo_size);
    const roh = Buffer.from(await fotoDatei.arrayBuffer());
    const typ = bildTyp(roh);
    if (!typ || !/^image\/(jpeg|png|webp)$/.test(fotoDatei.type || typ)) throw new HttpError(400, E.photo_type);
    try { foto = { typ, daten: stripMetadata(roh, typ) }; } catch (err) {
      if (err instanceof BildFehler) throw new HttpError(400, E.photo_type);
      throw err;
    }
  }

  // Rate-Limit (L13): je IP und Stunde, je E-Mail und Tag
  const jetzt = new Date().toISOString();
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || '';
  if (ip && !(await zaehle(`ip:${jetzt.slice(0, 13)}:${hash(ip)}`, LIMIT_IP_STUNDE))) throw new HttpError(429, E.rate);
  if (!(await zaehle(`mail:${jetzt.slice(0, 10)}:${hash(row.email)}`, LIMIT_MAIL_TAG))) return fertig({ stufe }); // still: gleiche Antwort

  // Gibt es die Adresse schon? (gespeichert immer in Kleinbuchstaben)
  const vorhanden = (await sb(`/rest/v1/squadra_tre?email=eq.${encodeURIComponent(row.email)}&select=*&order=created_at.desc&limit=1`))?.[0];
  // Antwort ist immer dieselbe (mit der eingegebenen Altersstufe) – ob die Adresse existiert, verrät sie nicht (R2).
  if (vorhanden) {
    const fall = doppelteAnmeldung(vorhanden);
    if (fall === 'schon_dabei') { await sendeSchonDabeiMail(vorhanden); return fertig({ stufe }); }
    if (fall === 'erneut_senden') {
      // Offen und jünger als 7 Tage: dieselben Mails noch einmal – Gültigkeit wird NICHT verlängert (R5)
      if (vorhanden.einwilligung_eltern && (vorhanden.altersstufe === 'unter16' || (vorhanden.altersstufe === '16bis17' && vorhanden.foto_pfad))) await sendeElternMail(vorhanden);
      await sendeFanMail(vorhanden);
      return fertig({ stufe });
    }
    // Offen und älter als 7 Tage: alte Anmeldung samt Foto löschen und neu anlegen – nie länger als 7 Tage je Versuch
    if (vorhanden.foto_pfad) await sbRemove('squadra', vorhanden.foto_pfad);
    await sb(`/rest/v1/squadra_tre?id=eq.${vorhanden.id}`, { method: 'DELETE' });
    await pinsEntfernen(vorhanden.id);
  }

  const [created] = await sb('/rest/v1/squadra_tre?select=*', { method: 'POST', body: row, headers: { Prefer: 'return=representation' } });

  if (foto) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[foto.typ];
    const pfad = `${created.id}.${ext}`;
    await sbUpload('squadra', pfad, foto.daten, foto.typ);
    await sb(`/rest/v1/squadra_tre?id=eq.${created.id}`, { method: 'PATCH', body: { foto_pfad: pfad } });
    created.foto_pfad = pfad;
  }

  if (geprueft.elternNoetig) await sendeElternMail(created);
  await sendeFanMail(created, { zahlungsinfo: created.mitgliedschaft === 'unterstuetzer' ? (process.env.SQUADRA_ZAHLUNGSINFO || '') : '' });

  return fertig({ stufe });
});

export const config = { path: '/api/squadra-join' };
