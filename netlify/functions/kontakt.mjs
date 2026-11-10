// © 2026 LBC3
// Kontaktformular: Nachricht per E-Mail an LBC3 und automatische Eingangsbestätigung an den Absender
// in der Sprache der Seite, auf der geschrieben wurde. Versand über Brevo (EU).
// Die Bestätigung enthält bewusst keinen vom Absender eingegebenen Text – auch nicht den Namen –, damit sie
// nicht als Spam-Schleuder missbraucht werden kann. Dazu Honeypot-Feld und Zeitstempel gegen Bots.
// Seit 10.11.2026: Jede Anfrage wird zusätzlich in der Kartei (Supabase, Tabelle kontakt_anfragen) gespeichert und
// geprüft (_lib/spam.mjs). Label „OK“ → E-Mail wie bisher. Label „Spam“ → nur still in der Kartei, keine E-Mail
// (Vorgabe des Eigentümers). Klappt das Speichern nicht, geht die Nachricht immer per E-Mail raus – es geht nichts verloren.
import { handle, json, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, env, botGrund, sb } from './_lib/common.mjs';
import { KONTAKT, ERR, pickLang, langPrefix } from './_lib/texte.mjs';
import { pruefeAnfrage } from './_lib/spam.mjs';

const LOCKFELD_PRO_TAG = 200; // höchstens so viele Lockfeld-Treffer pro Tag speichern (Schutz vor Flut)
const KARTEI_TIMEOUT = 2500; // ms – antwortet Supabase nicht rechtzeitig, geht die Nachricht per E-Mail raus

// Nur frühere OK-Anfragen zählen – sonst könnte jemand mit Lockfeld-Einträgen die Adresse eines echten Partners „vorbelasten“.
async function vorherige24h(email) {
  const seit = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const rows = await sb(`/rest/v1/kontakt_anfragen?email=eq.${encodeURIComponent(email)}&status=eq.ok&created_at=gte.${encodeURIComponent(seit)}&select=id&limit=10`, { timeout: KARTEI_TIMEOUT }).catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
}

async function lockfeldHeuteVoll() {
  const heute = new Date(); heute.setUTCHours(0, 0, 0, 0);
  const rows = await sb(`/rest/v1/kontakt_anfragen?status=eq.spam&spam_wert=gte.10&created_at=gte.${encodeURIComponent(heute.toISOString())}&select=id&limit=${LOCKFELD_PRO_TAG}`, { timeout: KARTEI_TIMEOUT }).catch(() => []);
  return Array.isArray(rows) && rows.length >= LOCKFELD_PRO_TAG;
}

// Speichert die Anfrage; true = gespeichert
async function speichern(row) {
  try {
    await sb('/rest/v1/kontakt_anfragen', { method: 'POST', body: row, headers: { Prefer: 'return=minimal' }, timeout: KARTEI_TIMEOUT });
    return true;
  } catch (err) {
    console.warn('Anfrage nicht in der Kartei gespeichert:', err.message);
    return false;
  }
}

const ANLIEGEN = { sponsoring: 'Sponsoring / Partnerschaft', mappe: 'Partnermappe anfordern', presse: 'Presse', sonstiges: 'Sonstiges' };
const SPRACHE = { de: 'Deutsch', it: 'Italienisch', en: 'Englisch', fr: 'Französisch' };

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  const b = await readBody(req);
  const lang = pickLang(b.sprache);
  const E = ERR[lang];
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  const done = () => (wantsJson ? json({ ok: true }) : Response.redirect(`${siteUrl()}${langPrefix(lang)}/danke/`, 303));
  // Fehler: zurück zum Formular mit Hinweis in der Sprache der Seite (statt einer technischen Meldung)
  const fail = (msg) => (wantsJson ? json({ error: msg }, 400) : Response.redirect(`${siteUrl()}${langPrefix(lang)}/kontakt/?fehler=1#nachricht`, 303));
  const honeypot = !!b['bot-field'];
  const botZeit = botGrund(b); // 'schnell' | 'alt' | 'fehlt' | null
  const bot = !!botZeit; // ohne gültigen Zeitstempel: keine automatische Antwort

  const name = String(b.name || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  const firma = String(b.firma || '').trim().slice(0, 120);
  const anliegenKey = ANLIEGEN[b.anliegen] ? b.anliegen : 'sonstiges';
  const anliegen = ANLIEGEN[anliegenKey];
  const nachricht = String(b.nachricht || '').trim().slice(0, 5000);
  const gueltig = name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && nachricht;
  if (honeypot) { // Honeypot: Bots still ignorieren – mit gültigen Feldern als Spam in die Kartei
    if (gueltig && !(await lockfeldHeuteVoll())) {
      const p = pruefeAnfrage({ name, email, firma, nachricht, honeypot: true, botZeit });
      await speichern({ name, email, firma: firma || null, anliegen: anliegenKey, sprache: lang, nachricht, status: 'spam', spam_wert: p.wert, spam_gruende: p.gruende });
    }
    return done();
  }
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(E.name_mail);
  if (!nachricht) return fail(E.message);
  if (!b.datenschutz) return fail(E.privacy);

  // 0) Prüfen und in der Kartei speichern
  const pruef = pruefeAnfrage({ name, email, firma, nachricht, honeypot: false, botZeit }, { vorherige24h: await vorherige24h(email) });
  const gespeichert = await speichern({ name, email, firma: firma || null, anliegen: anliegenKey, sprache: lang, nachricht, status: pruef.status, spam_wert: pruef.wert, spam_gruende: pruef.gruende });
  if (pruef.status === 'spam' && gespeichert) return done(); // Spam: nur still in der Kartei
  const spamHinweis = pruef.status === 'spam' ? '[Verdacht auf Spam] ' : '';

  // 1) An das Team (immer Deutsch)
  const an = process.env.KONTAKT_EMAIL || process.env.MAIL_REPLY_TO || env('MAIL_FROM');
  await sendMail({
    to: { email: an },
    replyTo: { email, name },
    subject: `${spamHinweis}Kontakt: ${anliegen} – ${name}`,
    html: mailLayout('Neue Nachricht über die Website', `
      <p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>E-Mail:</strong> ${escapeHtml(email)}${firma ? `<br><strong>Firma:</strong> ${escapeHtml(firma)}` : ''}<br><strong>Anliegen:</strong> ${escapeHtml(anliegen)}<br><strong>Sprache:</strong> ${SPRACHE[lang]}</p>
      <p>${escapeHtml(nachricht).replace(/\n/g, '<br>')}</p>
      <p style="color:#555A63;font-size:13px">Antworten: einfach auf diese E-Mail antworten – sie geht direkt an ${escapeHtml(email)}.<br>${gespeichert ? 'Die Anfrage steht auch im Team-Bereich unter „Anfragen“.' : 'Hinweis: Die Anfrage konnte nicht in der Kartei gespeichert werden.'}</p>`)
  });

  // 2) Eingangsbestätigung an den Absender – in seiner Sprache (nicht bei Verdacht auf Bot)
  const T = KONTAKT[lang];
  if (!bot && pruef.status === 'ok') await sendMail({
    to: { email },
    subject: T.subject,
    html: mailLayout(T.title, `<p>Ciao,</p><p>${T.body}</p><p>${T.bye}</p><p style="color:#555A63;font-size:12px">${T.auto}</p>`)
  }).catch((err) => console.warn('Eingangsbestätigung nicht gesendet:', err.message));

  return done();
});

export const config = { path: '/api/kontakt' };
