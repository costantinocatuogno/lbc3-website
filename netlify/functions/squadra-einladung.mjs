// Team-Bereich: persönliche Einladungen zur Squadra Tre – per Instagram (merken) und per E-Mail (merken oder direkt senden).
import { handle, json, requireAdmin, readBody, HttpError, sb, sendMail, mailLayout, escapeHtml, siteUrl } from './_lib/common.mjs';
import { liste, hinzufuegen, entfernen, mailListe, mailMerken, mailEntfernen, heuteGesendet } from './_lib/einladungen.mjs';
import { langPrefix } from './_lib/texte.mjs';

const LANGS = ['de', 'it', 'en', 'fr'];
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TAG = 30;
const BETREFF = {
  de: 'Einladung in Luigis Fanclub – die Squadra Tre 🏁',
  it: 'Invito nel fan club di Luigi – la Squadra Tre 🏁',
  en: 'Invitation to Luigi’s fan club – the Squadra Tre 🏁',
  fr: 'Invitation au fan-club de Luigi – la Squadra Tre 🏁'
};
const KNOPF = { de: 'Jetzt der Squadra Tre beitreten', it: 'Entra nella Squadra Tre', en: 'Join the Squadra Tre', fr: 'Rejoindre la Squadra Tre' };
const FUSS = {
  de: 'Du bekommst diese E-Mail einmalig, weil wir dich persönlich einladen möchten. Es folgen keine weiteren E-Mails, wenn du nicht beitrittst.',
  it: 'Ricevi questa e-mail una sola volta perché vogliamo invitarti personalmente. Se non ti iscrivi, non riceverai altre e-mail.',
  en: 'You are receiving this email once because we would like to invite you personally. You will not receive further emails unless you join.',
  fr: 'Tu reçois cet e-mail une seule fois car nous souhaitons t’inviter personnellement. Tu ne recevras pas d’autres e-mails si tu ne nous rejoins pas.'
};

export default handle(async (req) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const mails = await mailListe();
    // Status: hat sich die Adresse inzwischen angemeldet? (nur Abgleich, keine Daten aus der Anmeldung zurückgeben)
    let dabei = new Set();
    if (mails.length) {
      try {
        const rows = await sb(`/rest/v1/squadra_tre?select=email&email=in.(${mails.map((m) => `"${m.e.replace(/"/g, '')}"`).join(',')})`);
        dabei = new Set((rows || []).map((r) => String(r.email).toLowerCase()));
      } catch (e) { console.warn('Abgleich Squadra:', e.message); }
    }
    return json({ einladungen: await liste(), mails: mails.map((m) => ({ ...m, angemeldet: dabei.has(m.e) })) });
  }
  const b = await readBody(req);
  const sprache = LANGS.includes(b.sprache) ? b.sprache : 'de';
  if (b.typ === 'mail') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!MAIL_RE.test(email) || email.length > 200) throw new HttpError(400, 'Bitte eine gültige E-Mail-Adresse eingeben.');
    const name = String(b.name || '').trim().slice(0, 80);
    if (req.method === 'DELETE') { await mailEntfernen(email); return json({ ok: true }); }
    if (req.method !== 'POST') throw new HttpError(405, 'Nicht erlaubt.');
    if (!b.senden) { await mailMerken(email, name, sprache, 'eigenes Postfach'); return json({ ok: true }); }
    // Direkt senden: nur mit bestätigtem Einverständnis, einmal je Adresse, max. 30 am Tag
    if (b.einverstanden !== true) throw new HttpError(400, 'Bitte bestätigen, dass ihr die Person kennt und sie mit der Einladung einverstanden ist.');
    if ((await mailListe()).some((x) => x.e === email && x.w === 'direkt')) throw new HttpError(409, 'Diese Adresse wurde schon direkt eingeladen – bitte nicht zweimal senden.');
    if ((await heuteGesendet()) >= MAX_TAG) throw new HttpError(429, `Heute wurden schon ${MAX_TAG} Einladungen gesendet – bitte morgen weitermachen.`);
    const text = String(b.text || '').trim().slice(0, 3000);
    if (text.length < 20) throw new HttpError(400, 'Die Nachricht ist zu kurz.');
    const link = `${siteUrl()}${langPrefix(sprache)}/squadra-tre/#beitreten`;
    const absaetze = escapeHtml(text.replace(/\s*https?:\/\/\S+squadra-tre\S*/g, '')).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    await sendMail({
      to: [{ email, name: name || undefined }],
      subject: BETREFF[sprache],
      html: mailLayout(BETREFF[sprache].replace(' 🏁', ''), `${absaetze}
        <p style="margin:24px 0"><a href="${link}" style="background:#C8102E;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${KNOPF[sprache]}</a></p>
        <p style="font-size:12px;color:#555A63">${FUSS[sprache]}</p>`)
    });
    await mailMerken(email, name, sprache, 'direkt');
    return json({ ok: true, gesendet: true });
  }
  // Instagram
  if (req.method === 'POST') {
    const h = await hinzufuegen(b.handle, sprache);
    if (!h) throw new HttpError(400, 'Bitte einen gültigen Instagram-Namen eingeben.');
    return json({ ok: true, handle: h });
  }
  if (req.method === 'DELETE') { await entfernen(b.handle); return json({ ok: true }); }
  throw new HttpError(405, 'Nicht erlaubt.');
});

export const config = { path: '/api/squadra-einladung' };
