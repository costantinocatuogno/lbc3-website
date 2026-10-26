// Kontaktformular: Nachricht per E-Mail an LBC3 und automatische Eingangsbestätigung an den Absender
// in der Sprache der Seite, auf der geschrieben wurde. Versand über Brevo (EU).
// Die Bestätigung enthält bewusst keinen vom Absender eingegebenen Text – auch nicht den Namen –, damit sie
// nicht als Spam-Schleuder missbraucht werden kann. Dazu Honeypot-Feld und Zeitstempel gegen Bots.
import { handle, json, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, env, looksLikeBot } from './_lib/common.mjs';
import { KONTAKT, ERR, pickLang, langPrefix } from './_lib/texte.mjs';

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
  if (b['bot-field']) return done(); // Honeypot: Bots still ignorieren
  const bot = looksLikeBot(b); // ohne gültigen Zeitstempel: Nachricht ans Team ja, aber keine automatische Antwort

  const name = String(b.name || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  const firma = String(b.firma || '').trim().slice(0, 120);
  const anliegen = ANLIEGEN[b.anliegen] || ANLIEGEN.sonstiges;
  const nachricht = String(b.nachricht || '').trim().slice(0, 5000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(E.name_mail);
  if (!nachricht) return fail(E.message);
  if (!b.datenschutz) return fail(E.privacy);

  // 1) An das Team (immer Deutsch)
  const an = process.env.KONTAKT_EMAIL || process.env.MAIL_REPLY_TO || env('MAIL_FROM');
  await sendMail({
    to: { email: an },
    replyTo: { email, name },
    subject: `Kontakt: ${anliegen} – ${name}`,
    html: mailLayout('Neue Nachricht über die Website', `
      <p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>E-Mail:</strong> ${escapeHtml(email)}${firma ? `<br><strong>Firma:</strong> ${escapeHtml(firma)}` : ''}<br><strong>Anliegen:</strong> ${escapeHtml(anliegen)}<br><strong>Sprache:</strong> ${SPRACHE[lang]}</p>
      <p>${escapeHtml(nachricht).replace(/\n/g, '<br>')}</p>
      <p style="color:#555A63;font-size:13px">Antworten: einfach auf diese E-Mail antworten – sie geht direkt an ${escapeHtml(email)}.</p>`)
  });

  // 2) Eingangsbestätigung an den Absender – in seiner Sprache (nicht bei Verdacht auf Bot)
  const T = KONTAKT[lang];
  if (!bot) await sendMail({
    to: { email },
    subject: T.subject,
    html: mailLayout(T.title, `<p>Ciao,</p><p>${T.body}</p><p>${T.bye}</p><p style="color:#555A63;font-size:12px">${T.auto}</p>`)
  }).catch((err) => console.warn('Eingangsbestätigung nicht gesendet:', err.message));

  return done();
});

export const config = { path: '/api/kontakt' };
