// Kontaktformular: Nachricht per E-Mail an LBC3 und automatische Eingangsbestätigung an den Absender
// in der Sprache der Seite, auf der geschrieben wurde. Versand über Brevo (EU).
// Die Bestätigung enthält bewusst keinen vom Absender eingegebenen Text (kein Missbrauch als Spam-Schleuder).
import { handle, json, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, env } from './_lib/common.mjs';
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
  if (b['bot-field']) return done(); // Honeypot: Bots still ignorieren

  const name = String(b.name || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  const firma = String(b.firma || '').trim().slice(0, 120);
  const anliegen = ANLIEGEN[b.anliegen] || ANLIEGEN.sonstiges;
  const nachricht = String(b.nachricht || '').trim().slice(0, 5000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, E.name_mail);
  if (!nachricht) throw new HttpError(400, E.message);
  if (!b.datenschutz) throw new HttpError(400, E.privacy);

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

  // 2) Eingangsbestätigung an den Absender – in seiner Sprache
  const T = KONTAKT[lang];
  await sendMail({
    to: { email, name },
    subject: T.subject,
    html: mailLayout(T.title, `<p>Ciao ${escapeHtml(name)},</p><p>${T.body}</p><p>${T.bye}</p><p style="color:#555A63;font-size:12px">${T.auto}</p>`)
  }).catch((err) => console.warn('Eingangsbestätigung nicht gesendet:', err.message));

  return done();
});

export const config = { path: '/api/kontakt' };
