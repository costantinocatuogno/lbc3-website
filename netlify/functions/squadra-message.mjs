// Nachricht an alle Squadra-3-Mitglieder, die Renn-Updates abonniert haben (nur Admins).
// L12: unter 16 nur mit Zustimmung der Eltern zu „Updates“; jede Mail mit Link „Daten ändern oder löschen“ und List-Unsubscribe.
import { handle, json, sb, sendMail, mailLayout, escapeHtml, siteUrl, requireAdmin, readBody, HttpError } from './_lib/common.mjs';

import { ABMELDEN, pickLang, langPrefix } from './_lib/texte.mjs';
import { mailEmpfaenger } from './_lib/squadra-rules.mjs';
import { verwaltenFuss, abmeldeHeader } from './_lib/squadra-mail.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  await requireAdmin(req);
  const b = await readBody(req);
  const betreff = String(b.betreff || '').trim().slice(0, 150);
  const text = String(b.text || '').trim().slice(0, 5000);
  if (!betreff || !text) throw new HttpError(400, 'Bitte Betreff und Text angeben.');
  const test = !!b.test;

  let empfaenger;
  if (test) {
    empfaenger = [{ email: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM, name: 'Test', sprache: 'de' }];
  } else {
    empfaenger = mailEmpfaenger(await sb('/rest/v1/squadra_tre?select=*&optin_bestaetigt=eq.true&updates_optin=eq.true'), 'updates');
  }
  let gesendet = 0;
  for (const r of empfaenger) {
    if (!r.email) continue;
    await sendMail({
      to: { email: r.email, name: r.name },
      subject: betreff,
      headers: abmeldeHeader(r),
      html: mailLayout(escapeHtml(betreff), `
        <p>Ciao ${escapeHtml(r.name || '')},</p>
        <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        <p><a href="${siteUrl()}${langPrefix(pickLang(r.sprache))}/squadra-tre/" style="color:#B00E28;font-weight:bold">#SquadraTre · #LBC3</a></p>
        <p style="color:#555A63;font-size:12px">${ABMELDEN[pickLang(r.sprache)]}</p>
        ${verwaltenFuss(r)}`)
    });
    gesendet++;
  }
  return json({ ok: true, gesendet });
});

export const config = { path: '/api/squadra-message' };
