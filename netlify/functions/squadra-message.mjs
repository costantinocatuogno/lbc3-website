// Nachricht an alle Squadra-3-Mitglieder, die Renn-Updates abonniert haben (nur Admins).
import { handle, json, sb, sendMail, mailLayout, escapeHtml, siteUrl, requireAdmin, readBody, HttpError } from './_lib/common.mjs';

const ABMELDEN = { de: 'Keine Updates mehr? Antworte einfach mit „Abmelden“.', en: 'No more updates? Just reply with “unsubscribe”.', it: 'Non vuoi più aggiornamenti? Rispondi con “disiscrivimi”.' };

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
    empfaenger = await sb('/rest/v1/squadra_tre?select=email,name,sprache&optin_bestaetigt=eq.true&updates_optin=eq.true');
  }
  let gesendet = 0;
  for (const r of empfaenger) {
    if (!r.email) continue;
    await sendMail({
      to: { email: r.email, name: r.name },
      subject: betreff,
      html: mailLayout(escapeHtml(betreff), `
        <p>Ciao ${escapeHtml(r.name || '')},</p>
        <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        <p><a href="${siteUrl()}/squadra-tre/" style="color:#B00E28;font-weight:bold">#SquadraLBC3 · #LBC3</a></p>
        <p style="color:#555A63;font-size:12px">${ABMELDEN[r.sprache] || ABMELDEN.de}</p>`)
    });
    gesendet++;
  }
  return json({ ok: true, gesendet });
});

export const config = { path: '/api/squadra-message' };
