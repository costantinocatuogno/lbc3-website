// © 2026 LBC3
// Spam-Prüfung für Anfragen aus dem Kontaktformular. Reine Rechenlogik, ohne Netzwerk – damit testbar.
// Jede Regel gibt Punkte und einen gut lesbaren Grund. Ab SPAM_GRENZE Punkten bekommt die Anfrage das rote Label „Spam“.
// Das Label kann im Team-Bereich jederzeit von Hand geändert werden – die Prüfung ist eine Vorsortierung, kein Urteil.

export const SPAM_GRENZE = 5;

// Typische Wörter aus Werbe- und Betrugs-Mails (DE/EN/IT/FR). Gesucht als ganzes Wort; „*“ am Ende = Wortanfang genügt.
// Bewusst NICHT dabei: „Ranking“, „Sponsor“, „Marketing“ – das sind im Motorsport normale Wörter.
const SPAM_WOERTER = [
  'seo', 'backlink*', 'guest post*', 'gastbeitrag*', 'first page of google', 'erste seite bei google', 'prima pagina di google',
  'rank your website', 'increase traffic', 'website traffic', 'more traffic', 'lead generation', 'leads for your',
  'web design services', 'website redesign', 'app development services', 'outsourc*', 'virtual assistant*',
  'crypto*', 'bitcoin*', 'btc', 'usdt', 'forex', 'binary option*', 'investment opportunit*', 'passive income',
  'loan*', 'kredit ohne', 'casino*', 'betting', 'viagra', 'cialis', 'cbd oil', 'weight loss',
  'click here', 'hier klicken', 'unsubscribe', 'limited time offer', 'act now', 'congratulations you',
  'telegram', 't.me', 'wa.me'
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORT_RE = SPAM_WOERTER.map((w) => {
  const prefix = w.endsWith('*');
  const kern = esc(prefix ? w.slice(0, -1) : w);
  return { w: prefix ? w.slice(0, -1) : w, re: new RegExp(`(?:^|[^\\p{L}\\p{N}])${kern}${prefix ? '' : '(?![\\p{L}\\p{N}])'}`, 'iu') };
});

// Wegwerf-Adressen (kleine, bewusst kurze Liste bekannter Anbieter)
const WEGWERF = ['mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'sharklasers.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'throwawaymail.com'];

const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|info|biz|xyz|top|ru|cn|io|co|shop|site|online)\b(?:\/\S*)?/gi;
// Schriften, die auf einer DE/IT/EN/FR-Seite nicht zu erwarten sind (Kyrillisch, Griechisch, Arabisch, Hebräisch, CJK, Thai, Devanagari …)
const FREMDE_SCHRIFT = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]/g;

/**
 * @param {object} a  Anfrage: { name, email, firma, nachricht, honeypot (bool), botZeit (bool) }
 * @param {object} [kontext] { vorherige24h: Anzahl früherer Anfragen derselben E-Mail in 24 h }
 * @returns {{ wert:number, gruende:string[], status:'ok'|'spam' }}
 */
export function pruefeAnfrage(a, kontext = {}) {
  const gruende = [];
  let wert = 0;
  const plus = (p, g) => { wert += p; gruende.push(g); };
  const name = String(a.name || '');
  const email = String(a.email || '').toLowerCase();
  const firma = String(a.firma || '');
  const text = String(a.nachricht || '');
  const alles = `${name} ${firma} ${text}`.toLowerCase();

  if (a.honeypot) plus(10, 'Unsichtbares Lockfeld ausgefüllt (typisch für Roboter)');
  if (a.botZeit) plus(4, 'Formular zu schnell abgeschickt oder Seite älter als 24 Stunden');

  const links = (text.match(LINK) || []).length;
  if (links >= 3) plus(4, `${links} Links in der Nachricht`);
  else if (links >= 1) plus(1, `${links} Link${links > 1 ? 's' : ''} in der Nachricht`);

  if (new RegExp(LINK.source, 'i').test(name) || /[<>]/.test(name)) plus(3, 'Name enthält einen Link oder Zeichen wie < >');

  const treffer = WORT_RE.filter((x) => x.re.test(alles)).map((x) => x.w);
  if (treffer.length) plus(Math.min(6, treffer.length * 2), `Typische Werbe-/Spam-Wörter: ${treffer.slice(0, 5).join(', ')}`);

  const buchstaben = (text.match(/\p{L}/gu) || []).length;
  const fremd = (text.match(FREMDE_SCHRIFT) || []).length;
  if (buchstaben >= 10 && fremd / buchstaben > 0.3) plus(4, 'Nachricht überwiegend in einer Schrift, die nicht zu DE/IT/EN/FR passt');

  const domain = email.split('@')[1] || '';
  if (WEGWERF.some((d) => domain === d || domain.endsWith(`.${d}`))) plus(3, `Wegwerf-E-Mail-Adresse (${domain})`);

  if (text.trim().length < 15) plus(1, 'Sehr kurze Nachricht');
  if (/^[A-Z0-9\s!?.,]{30,}$/.test(text.trim())) plus(1, 'Nachricht nur in Großbuchstaben');

  const n = Number(kontext.vorherige24h) || 0;
  if (n >= 2) plus(3, `${n + 1}. Anfrage dieser E-Mail-Adresse innerhalb von 24 Stunden`);

  return { wert, gruende, status: wert >= SPAM_GRENZE ? 'spam' : 'ok' };
}
