// Beitritt zur Squadra Tre (kostenlos als Freund/Fan oder als Unterstützer mit Beitrag).
// Nimmt Formular-Daten inkl. optionalem Foto entgegen, speichert alles privat und schickt eine Bestätigungs-E-Mail (Double-Opt-in).
// Nichts wird öffentlich, bevor die E-Mail bestätigt UND das Foto von der Familie freigegeben wurde.
import { handle, json, sb, sbUpload, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, kurzName, cleanHandle } from './_lib/common.mjs';
import { JOIN as TEXT, ERR, pickLang, langPrefix } from './_lib/texte.mjs';

const yes = (v) => !!v && v !== 'false' && v !== '0';
const MAX_FOTO = 5 * 1024 * 1024;

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, ERR.de.post);
  const b = await readBody(req);
  const lang = pickLang(b.lang);
  const E = ERR[lang];
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  if (b.website) return json({ ok: true }); // Honeypot: Bots still ignorieren

  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !mail.test(email)) throw new HttpError(400, E.name_mail);
  if (!yes(b.datenschutz)) throw new HttpError(400, E.privacy);

  const minderjaehrig = b.alter === 'unter16';
  const elternEmail = String(b.eltern_email || '').trim().toLowerCase().slice(0, 200);
  if (minderjaehrig && (!mail.test(elternEmail) || elternEmail === email)) throw new HttpError(400, E.parent);

  const mitgliedschaft = b.mitgliedschaft === 'unterstuetzer' ? 'unterstuetzer' : 'freund';
  const art = mitgliedschaft === 'unterstuetzer' && ['einmalig', 'jaehrlich', 'sachleistung'].includes(b.art) ? b.art : null;
  const betrag = mitgliedschaft === 'unterstuetzer' && Number(b.betrag) > 0 ? Math.min(Number(b.betrag), 1000000) : null;

  // Foto (optional) prüfen – wird im Browser bereits auf ~1200 px verkleinert
  const foto = b.foto && typeof b.foto === 'object' && b.foto.size > 0 ? b.foto : null;
  if (foto) {
    if (!/^image\/(jpeg|png|webp)$/.test(foto.type)) throw new HttpError(400, E.photo_type);
    if (foto.size > MAX_FOTO) throw new HttpError(400, E.photo_size);
    if (!yes(b.foto_einwilligung)) throw new HttpError(400, E.photo_ok);
  }

  const row = {
    name, email, sprache: lang, mitgliedschaft, art, betrag,
    instagram: cleanHandle(b.instagram) || null,
    angezeigter_name: kurzName(name),
    minderjaehrig,
    einwilligung_eltern: minderjaehrig ? elternEmail : null,
    jahresbericht_optin: yes(b.jahresbericht),
    updates_optin: yes(b.updates),
    wand_optin: yes(b.wand) || (foto ? yes(b.foto_einwilligung) : false),
    quelle: 'website'
  };

  const [created] = await sb('/rest/v1/squadra_tre?select=id,token', {
    method: 'POST', body: row, headers: { Prefer: 'return=representation' }
  });

  if (foto) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[foto.type];
    const pfad = `${created.id}.${ext}`;
    await sbUpload('squadra', pfad, Buffer.from(await foto.arrayBuffer()), foto.type);
    await sb(`/rest/v1/squadra_tre?id=eq.${created.id}`, { method: 'PATCH', body: { foto_pfad: pfad } });
  }

  const tx = TEXT[lang];
  const confirmUrl = `${siteUrl()}/api/squadra-confirm?token=${encodeURIComponent(created.token)}`;
  const pay = mitgliedschaft === 'unterstuetzer' ? (process.env.SQUADRA_ZAHLUNGSINFO || '') : '';
  const button = (href, label) => `<p style="margin:24px 0"><a href="${href}" style="background:#B00E28;color:#ffffff;padding:14px 22px;border-radius:4px;text-decoration:none;font-weight:bold">${label}</a></p>`;

  // Unter 16: Bestätigung läuft über die Eltern-E-Mail
  if (minderjaehrig) {
    await sendMail({
      to: { email: elternEmail },
      subject: tx.psubject,
      html: mailLayout(tx.ptitle, `<p>${tx.pbody(escapeHtml(name))}</p>${button(confirmUrl + '&eltern=1', tx.pbtn)}<p style="color:#555A63;font-size:13px">${tx.ignore}</p>`)
    });
  }
  await sendMail({
    to: { email, name },
    subject: tx.subject,
    html: mailLayout(tx.title, `
      <p>${tx.hello} ${escapeHtml(name)},</p>
      ${minderjaehrig ? `<p>${tx.parent}</p>` : `<p>${tx.body}</p>${button(confirmUrl, tx.btn)}`}
      ${pay ? `<p><strong>${tx.pay}</strong><br>${escapeHtml(pay).replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>${tx.tag}</strong></p>
      <p style="color:#555A63;font-size:13px">${tx.ignore}</p>`)
  });

  if (wantsJson) return json({ ok: true });
  return Response.redirect(`${siteUrl()}${langPrefix(lang)}/squadra-tre/?beitritt=ok#beitreten`, 303);
});

export const config = { path: '/api/squadra-join' };
