// Squadra Tre – E-Mails an Fans und Eltern (gemeinsam für Anmeldung, Admin-Anforderung und Rundmails).
// Jede E-Mail enthält den Link „Daten ändern oder löschen“ (L9) mit dem langlebigen verwalten_token.
import { sendMail, mailLayout, escapeHtml, siteUrl } from './common.mjs';
import { JOIN, VERWALTEN, pickLang, langPrefix } from './texte.mjs';
import { kurzName, istMinderjaehrig, altBestaetigt } from './squadra-rules.mjs';

const seite = (lang, pfad, token) => `${siteUrl()}${langPrefix(lang)}${pfad}?t=${encodeURIComponent(token)}`;
export const bestaetigenUrl = (r) => seite(pickLang(r.sprache), '/squadra-bestaetigen/', r.token);
export const elternUrl = (r) => seite(pickLang(r.sprache), '/squadra-eltern/', r.eltern_token);
export const verwaltenUrl = (r) => (r && r.verwalten_token ? seite(pickLang(r.sprache), '/squadra-verwalten/', r.verwalten_token) : '');

export const button = (href, label) => `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#B00E28;color:#ffffff;padding:14px 22px;border-radius:4px;text-decoration:none;font-weight:bold">${label}</a></p>`;
const klein = (html) => `<p style="color:#555A63;font-size:13px">${html}</p>`;

export function verwaltenFuss(r) {
  const u = verwaltenUrl(r);
  if (!u) return '';
  const T = VERWALTEN[pickLang(r.sprache)];
  return klein(`<a href="${escapeHtml(u)}" style="color:#B00E28">${T.link}</a>`);
}

// List-Unsubscribe (L12): Ein-Klick-Abmeldung von Rundmails; das Postfach ruft die Adresse per POST auf.
export function abmeldeHeader(r) {
  if (!r || !r.verwalten_token) return undefined;
  return {
    'List-Unsubscribe': `<${siteUrl()}/api/squadra-verwalten?t=${encodeURIComponent(r.verwalten_token)}&aktion=abmelden>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}

// Mail an die Eltern: enthält NUR den Link zur Eltern-Seite (L1) – keine Daten zum Anklicken-und-fertig.
export async function sendeElternMail(r) {
  const lang = pickLang(r.sprache);
  const tx = JOIN[lang];
  const nurFoto = r.altersstufe === '16bis17';
  // Bestätigter Eintrag von vor dem Umbau: wird nie gelöscht, nur verborgen (R1) – Mail kündigt keine Löschung an
  const alt = altBestaetigt(r);
  const anzeige = escapeHtml(kurzName(r.name));
  await sendMail({
    to: { email: r.einwilligung_eltern },
    subject: tx.psubject,
    html: mailLayout(tx.ptitle, `<p>${nurFoto ? tx.pbody_foto(anzeige) : tx.pbody(anzeige)}</p>${button(elternUrl(r), tx.pbtn)}${klein(alt ? tx.pvalid_alt : tx.pvalid)}${klein(tx.pignore)}${verwaltenFuss(r)}`)
  });
}

// Mail an den Fan nach der Anmeldung: Bestätigungsknopf (nicht unter 16) bzw. nur Info (unter 16)
export async function sendeFanMail(r, { zahlungsinfo = '' } = {}) {
  if (!r.email) return;
  const lang = pickLang(r.sprache);
  const tx = JOIN[lang];
  const u16 = r.altersstufe === 'unter16';
  const fotoEltern = r.altersstufe === '16bis17' && r.foto_pfad && istMinderjaehrig(r);
  await sendMail({
    to: { email: r.email, name: r.name },
    subject: tx.subject,
    html: mailLayout(tx.title, `
      <p>${tx.hello} ${escapeHtml(r.name)},</p>
      ${u16 ? `<p>${tx.child_u16}</p>` : `<p>${tx.body}</p>${button(bestaetigenUrl(r), tx.btn)}${klein(tx.valid)}`}
      ${fotoEltern ? `<p>${tx.child_photo}</p>` : ''}
      ${zahlungsinfo ? `<p><strong>${tx.pay}</strong><br>${escapeHtml(zahlungsinfo).replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>${tx.tag}</strong></p>
      ${klein(tx.ignore)}
      ${verwaltenFuss(r)}`)
  });
}

// Mail bei erneuter Anmeldung mit einer schon bestätigten Adresse (verrät auf der Website nichts)
export async function sendeSchonDabeiMail(r) {
  if (!r.email) return;
  const lang = pickLang(r.sprache);
  const tx = JOIN[lang];
  await sendMail({
    to: { email: r.email, name: r.name },
    subject: tx.asubject,
    html: mailLayout(tx.atitle, `<p>${tx.hello} ${escapeHtml(r.name)},</p><p>${tx.abody}</p>${button(verwaltenUrl(r), VERWALTEN[lang].link)}`)
  });
}
