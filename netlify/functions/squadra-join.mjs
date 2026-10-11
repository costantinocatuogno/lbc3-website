// Beitritt zur Squadra Tre (kostenlos als Freund/Fan oder als Unterstützer mit Beitrag).
// Nimmt Formular-Daten inkl. optionalem Foto entgegen, speichert alles privat und schickt eine Bestätigungs-E-Mail (Double-Opt-in).
// Nichts wird öffentlich, bevor die E-Mail bestätigt UND das Foto von der Familie freigegeben wurde.
import { handle, json, sb, sbUpload, sendMail, mailLayout, escapeHtml, siteUrl, readBody, HttpError, kurzName, cleanHandle } from './_lib/common.mjs';

const TEXT = {
  de: { subject: 'Bitte bestätige deine Anmeldung zur Squadra Tre', title: 'Fast geschafft!', hello: 'Ciao', body: 'schön, dass du Teil der Squadra Tre wirst! Bitte bestätige mit einem Klick, dass diese E-Mail-Adresse dir gehört:', btn: 'Anmeldung bestätigen', pay: 'So kannst du deinen Beitrag leisten:', parent: 'Du hast angegeben, dass du unter 16 bist. Wir haben deshalb auch deinem Elternteil eine E-Mail geschickt.', ignore: 'Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.', tag: 'Poste deine Fotos mit #SquadraLBC3 und #LBC3!',
        psubject: 'Ihr Kind möchte der Squadra Tre von Luigi beitreten', ptitle: 'Einwilligung der Eltern', pbody: (n) => `<strong>${n}</strong> hat sich für die Squadra Tre angemeldet – den kostenlosen Fanclub des Kartfahrers Luigi Battista Catuogno (#3). Weil Ihr Kind unter 16 ist, brauchen wir Ihre Zustimmung. Mit dem Klick bestätigen Sie die Anmeldung und – falls ein Foto hochgeladen wurde – dass es nach unserer Prüfung auf der Wall of Fame (Website und gedruckte Fotowand am Rennzelt) gezeigt werden darf. Sie können die Einwilligung jederzeit per Antwort auf diese E-Mail widerrufen.`, pbtn: 'Ich stimme zu' },
  en: { subject: 'Please confirm your Squadra Tre sign-up', title: 'Almost there!', hello: 'Ciao', body: 'great to have you in Squadra Tre! Please confirm with one click that this email address belongs to you:', btn: 'Confirm sign-up', pay: 'How to make your contribution:', parent: 'You told us you are under 16, so we have also emailed your parent.', ignore: 'If you did not sign up, simply ignore this email.', tag: 'Post your photos with #SquadraLBC3 and #LBC3!',
        psubject: 'Your child would like to join Luigi\'s Squadra Tre', ptitle: 'Parental consent', pbody: (n) => `<strong>${n}</strong> signed up for Squadra Tre – the free fan club of kart driver Luigi Battista Catuogno (#3). As your child is under 16, we need your consent. By clicking you confirm the sign-up and – if a photo was uploaded – that, after our review, it may be shown on the Wall of Fame (website and printed photo wall at the race tent). You can withdraw consent at any time by replying to this email.`, pbtn: 'I agree' },
  it: { subject: 'Conferma la tua iscrizione alla Squadra Tre', title: 'Quasi fatto!', hello: 'Ciao', body: 'che bello averti nella Squadra Tre! Conferma con un clic che questo indirizzo e-mail è tuo:', btn: 'Conferma iscrizione', pay: 'Come dare il tuo contributo:', parent: 'Hai indicato di avere meno di 16 anni, quindi abbiamo scritto anche a un tuo genitore.', ignore: 'Se non ti sei iscritto, ignora semplicemente questa e-mail.', tag: 'Pubblica le tue foto con #SquadraLBC3 e #LBC3!',
        psubject: 'Vostro figlio/a vuole entrare nella Squadra Tre di Luigi', ptitle: 'Consenso dei genitori', pbody: (n) => `<strong>${n}</strong> si è iscritto/a alla Squadra Tre – il fan club gratuito del pilota di kart Luigi Battista Catuogno (#3). Poiché ha meno di 16 anni, serve il vostro consenso. Con il clic confermate l'iscrizione e – se è stata caricata una foto – che, dopo la nostra verifica, può essere mostrata sulla Wall of Fame (sito e parete fotografica stampata alla tenda). Potete revocare il consenso in qualsiasi momento rispondendo a questa e-mail.`, pbtn: 'Acconsento' }
};

const yes = (v) => !!v && v !== 'false' && v !== '0';
const MAX_FOTO = 5 * 1024 * 1024;

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  const b = await readBody(req);
  const wantsJson = (req.headers.get('accept') || '').includes('application/json');
  if (b.website) return json({ ok: true }); // Honeypot: Bots still ignorieren

  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  const lang = ['de', 'en', 'it'].includes(b.lang) ? b.lang : 'de';
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !mail.test(email)) throw new HttpError(400, 'Bitte Name und gültige E-Mail angeben.');
  if (!yes(b.datenschutz)) throw new HttpError(400, 'Bitte der Datenschutzerklärung zustimmen.');

  const minderjaehrig = b.alter === 'unter16';
  const elternEmail = String(b.eltern_email || '').trim().toLowerCase().slice(0, 200);
  if (minderjaehrig && (!mail.test(elternEmail) || elternEmail === email)) throw new HttpError(400, 'Bitte die E-Mail-Adresse eines Elternteils angeben.');

  const mitgliedschaft = b.mitgliedschaft === 'unterstuetzer' ? 'unterstuetzer' : 'freund';
  const art = mitgliedschaft === 'unterstuetzer' && ['einmalig', 'jaehrlich', 'sachleistung'].includes(b.art) ? b.art : null;
  const betrag = mitgliedschaft === 'unterstuetzer' && Number(b.betrag) > 0 ? Math.min(Number(b.betrag), 1000000) : null;

  // Foto (optional) prüfen – wird im Browser bereits auf ~1200 px verkleinert
  const foto = b.foto && typeof b.foto === 'object' && b.foto.size > 0 ? b.foto : null;
  if (foto) {
    if (!/^image\/(jpeg|png|webp)$/.test(foto.type)) throw new HttpError(400, 'Bitte ein JPG-, PNG- oder WebP-Foto hochladen.');
    if (foto.size > MAX_FOTO) throw new HttpError(400, 'Das Foto ist zu groß (max. 5 MB).');
    if (!yes(b.foto_einwilligung)) throw new HttpError(400, 'Bitte der Veröffentlichung des Fotos zustimmen oder das Foto entfernen.');
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
  return Response.redirect(`${siteUrl()}${lang === 'de' ? '' : '/' + lang}/squadra-tre/?beitritt=ok#beitreten`, 303);
});

export const config = { path: '/api/squadra-join' };
