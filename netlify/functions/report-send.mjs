// Saisonende: Jahresbericht an alle bestätigten Squadra-3-Mitglieder mit Häkchen "Jahresbericht" senden.
import { handle, json, sb, requireAdmin, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, env } from './_lib/common.mjs';

const eur = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  await requireAdmin(req);
  const { saison } = await readBody(req);
  const year = Number(saison);
  if (!Number.isInteger(year)) throw new HttpError(400, 'Ungültige Saison.');

  const [s] = await sb(`/rest/v1/bericht_saison?saison=eq.${year}&select=*`);
  if (!s || s.status !== 'freigegeben') throw new HttpError(400, 'Der Bericht muss zuerst freigegeben werden.');
  const ausgaben = await sb(`/rest/v1/ausgaben?saison=eq.${year}&select=kategorie,betrag&order=id`);
  const total = ausgaben.reduce((a, r) => a + Number(r.betrag || 0), 0);
  const empfaenger = await sb('/rest/v1/squadra_tre?select=name,email&optin_bestaetigt=eq.true&jahresbericht_optin=eq.true');
  if (!empfaenger.length) return json({ ok: true, gesendet: 0 });

  // PDF als Anhang (signierter Link, 7 Tage gültig – Brevo lädt die Datei beim Versand)
  let pdfUrl = '';
  if (s.pdf_bericht) {
    const signed = await sb(`/storage/v1/object/sign/berichte/${s.pdf_bericht}`, { method: 'POST', body: { expiresIn: 60 * 60 * 24 * 7 } });
    pdfUrl = `${env("SUPABASE_URL")}/storage/v1${signed.signedURL || signed.signedUrl}`;
  }

  const tabelle = ausgaben.map((r) => `<tr><td style="padding:6px 0;border-bottom:1px solid #ECEDEF">${escapeHtml(r.kategorie)}</td><td style="padding:6px 0;border-bottom:1px solid #ECEDEF;text-align:right"><strong>${eur(r.betrag)}</strong></td></tr>`).join('');
  const inhalt = (name) => `
    <p>Ciao ${escapeHtml(name)},</p>
    <p>die Saison ${year} ist vorbei – und du warst als Teil der <strong>Squadra Tre</strong> dabei. Danke! Wie versprochen zeigen wir dir, wofür die Unterstützung eingesetzt wurde.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;margin:16px 0">${tabelle}
      <tr><td style="padding:10px 0"><strong>Gesamt</strong></td><td style="padding:10px 0;text-align:right;color:#B00E28"><strong>${eur(total)}</strong></td></tr></table>
    <p>Davon getragen durch Partner und Squadra Tre: <strong>${eur(Number(s.fin_sponsoren || 0) + Number(s.fin_squadra || 0))}</strong>.</p>
    ${s.rueckblick ? `<h2 style="font-size:18px;margin:24px 0 8px">Saisonrückblick</h2><p>${escapeHtml(s.rueckblick).replace(/\n/g, '<br>')}</p>` : ''}
    ${pdfUrl ? '<p>Den ausführlichen Jahresbericht findest du im Anhang.</p>' : ''}
    <p>Forza #LBC3!<br>Luigi &amp; Familie</p>
    <p style="color:#555A63;font-size:12px">Du bekommst diese E-Mail, weil du bei der Anmeldung zur Squadra Tre den Jahresbericht angefordert hast. Abmelden: Antworte einfach auf diese E-Mail.</p>`;

  let gesendet = 0;
  for (const r of empfaenger) {
    await sendMail({
      to: { email: r.email, name: r.name },
      subject: `Squadra Tre · Jahresbericht ${year}`,
      html: mailLayout(`Jahresbericht ${year}`, inhalt(r.name)),
      attachmentUrl: pdfUrl || undefined,
      attachmentName: `LBC3-Jahresbericht-${year}.pdf`
    });
    gesendet++;
  }
  await sb(`/rest/v1/bericht_saison?saison=eq.${year}`, { method: 'PATCH', body: { mail_versendet_am: new Date().toISOString() } });
  return json({ ok: true, gesendet, website: siteUrl() });
});

export const config = { path: '/api/report-send' };
