// Gemeinsame Helfer für die Netlify Functions (ohne externe Pakete).

export function env(name, required = true) {
  let v = (process.env[name] || '').trim();
  if (name === 'SUPABASE_URL') {
    const m = v.match(/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)/i);
    v = m ? m[0] : v.replace(/\/+$/, '');
  }
  if (required && !v) throw new HttpError(503, `Server ist noch nicht eingerichtet (${name} fehlt).`);
  return v || '';
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export function handle(fn) {
  return async (req, context) => {
    try {
      return await fn(req, context);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(err);
      // Kurze technische Ursache mitgeben (ohne Schlüssel), damit Fehler bei der Einrichtung schnell gefunden werden
      const cause = err && err.cause ? ` [${err.cause.code || ''} ${err.cause.hostname || err.cause.host || ''} ${err.cause.message || ''}]` : '';
      const detail = (String(err && (err.message || err)) + cause).replace(/(key|token|secret)=\S+/gi, '$1=…').slice(0, 160);
      return json({ error: err instanceof HttpError ? err.message : `Interner Fehler: ${detail}` }, status);
    }
  };
}

export const siteUrl = () => (process.env.URL || process.env.SITE_URL || '').replace(/\/$/, '');

// ---------- Supabase (REST, mit Service-Role-Key – nur serverseitig!) ----------
// Funktioniert mit dem alten service_role-Key (JWT) und dem neuen Secret Key (sb_secret_…):
// Neue Keys gehören nur in den apikey-Header, nicht in Authorization.
export function keyHeaders(key) {
  return String(key).startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

function sbHeaders(extra = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return { ...keyHeaders(key), 'Content-Type': 'application/json', ...extra };
}

// timeout (ms, optional): bricht ab, wenn Supabase nicht rechtzeitig antwortet
export async function sb(path, { method = 'GET', body, headers = {}, timeout } = {}) {
  const base = env('SUPABASE_URL');
  let res;
  try {
    res = await fetch(`${base}${path}`, { method, headers: sbHeaders(headers), body: body ? JSON.stringify(body) : undefined, signal: timeout ? AbortSignal.timeout(timeout) : undefined });
  } catch (e) {
    throw new HttpError(502, `Supabase nicht erreichbar (${base.replace(/^https?:\/\//, '').slice(0, 40)}): ${e.cause?.code || e.message}`);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: `Supabase antwortet unerwartet (HTTP ${res.status}) – SUPABASE_URL prüfen` }; }
  if (!res.ok) throw new HttpError(res.status >= 500 ? 502 : 400, `Supabase: ${data?.msg || data?.message || data?.error_description || res.status}${data?.hint ? ' – ' + data.hint : ''}`);
  return data;
}

// Prüft das Login-Token des Aufrufers und verlangt die Rolle "admin".
export async function requireAdmin(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token === 'null' || token === 'undefined') throw new HttpError(401, 'Nicht angemeldet – bitte neu anmelden.');
  const base = env('SUPABASE_URL');
  const anon = env('SUPABASE_ANON_KEY');
  const userHeaders = { apikey: anon, Authorization: `Bearer ${token}` };
  let res;
  try { res = await fetch(`${base}/auth/v1/user`, { headers: userHeaders }); }
  catch (e) { throw new HttpError(502, `Supabase nicht erreichbar: ${e.cause?.code || e.message}`); }
  if (!res.ok) throw new HttpError(401, 'Sitzung abgelaufen – bitte abmelden und neu anmelden.');
  const user = await res.json();
  // Rolle mit dem Login des Aufrufers lesen (RLS erlaubt das eigene Profil) – unabhängig vom Service-Key
  let rolle = null;
  try {
    const r = await fetch(`${base}/rest/v1/profiles?id=eq.${user.id}&select=rolle`, { headers: userHeaders });
    const rows = r.ok ? await r.json() : [];
    rolle = rows?.[0]?.rolle || null;
  } catch { /* unten Fallback */ }
  if (!rolle) {
    const rows = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=rolle`).catch(() => []);
    rolle = rows?.[0]?.rolle || null;
  }
  if (rolle !== 'admin') {
    throw new HttpError(403, `Nur für Admins (angemeldet als ${user.email || '?'}, ${rolle ? 'Rolle: ' + rolle : 'kein Profil gefunden'}).`);
  }
  return user;
}

// ---------- E-Mail über Brevo (EU) ----------
// headers: zusätzliche E-Mail-Header (z. B. List-Unsubscribe) – Brevo übernimmt sie unverändert.
export async function sendMail({ to, subject, html, attachmentUrl, attachmentName, replyTo, headers }) {
  const body = {
    sender: { email: env('MAIL_FROM'), name: process.env.MAIL_FROM_NAME || 'LBC3 · Luigi Battista Catuogno' },
    replyTo: replyTo || { email: process.env.MAIL_REPLY_TO || env('MAIL_FROM') },
    to: Array.isArray(to) ? to : [to],
    subject,
    htmlContent: html
  };
  if (headers && Object.keys(headers).length) body.headers = headers;
  if (attachmentUrl) body.attachment = [{ url: attachmentUrl, name: attachmentName || 'jahresbericht.pdf' }];
  let res;
  try { res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env('BREVO_API_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  }); } catch (e) { throw new HttpError(502, `Brevo nicht erreichbar: ${e.cause?.code || e.message}`); }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    let m = ''; try { m = JSON.parse(t).message || ''; } catch { m = t.slice(0, 120); }
    throw new HttpError(502, `E-Mail-Versand fehlgeschlagen (Brevo ${res.status}${m ? ': ' + m : ''}).`);
  }
}

// Schutz vor automatisierten Absendungen: das Formular trägt beim Laden einen Zeitstempel ein.
// Zu schnell (unter 3 Sekunden), zu alt (über 1 Tag) oder ohne Zeitstempel = vermutlich ein Bot.
export function looksLikeBot(b) {
  return !!botGrund(b);
}

// Wie looksLikeBot, nennt aber den Grund: 'fehlt' | 'schnell' | 'alt' | null (= unauffällig)
export function botGrund(b) {
  const t = Number(b && b.t);
  if (!t) return 'fehlt';
  const age = Date.now() - t;
  if (age < 3000) return 'schnell';
  if (age > 24 * 60 * 60 * 1000) return 'alt';
  return null;
}

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mailLayout(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#EDEEF0;font-family:Arial,sans-serif;color:#121418">
  <div style="max-width:600px;margin:0 auto;background:#ffffff">
    <div style="background:#121418;color:#ffffff;padding:24px 28px;font-size:22px;font-weight:bold;letter-spacing:1px">LBC3 · <span style="color:#E3B23C">#3</span></div>
    <div style="height:4px;background:linear-gradient(90deg,#000 0 14%,#C8102E 14% 28%,#E0B000 28% 42%,#2A2D33 42% 58%,#1E8E3E 58% 72%,#F2F3F5 72% 86%,#C8102E 86%)"></div>
    <div style="padding:28px;font-size:16px;line-height:1.6">
      <h1 style="font-size:24px;margin:0 0 16px">${title}</h1>
      ${inner}
    </div>
    <div style="padding:20px 28px;background:#121418;color:#9AA0A9;font-size:12px">LBC3 · Luigi Battista Catuogno · ${escapeHtml(siteUrl())}</div>
  </div></body></html>`;
}

export async function readBody(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) return await req.json();
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}

// ---------- Supabase Storage (privat) ----------
export async function sbUpload(bucket, path, data, contentType) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { ...keyHeaders(key), 'Content-Type': contentType, 'x-upsert': 'true' },
    body: data
  });
  if (!res.ok) throw new HttpError(502, `Bild-Upload fehlgeschlagen (${res.status}).`);
  return path;
}

// Löst den Netlify-Build aus (neue Wall-of-Fame-Einträge erscheinen nach ca. 1–2 Minuten)
export async function triggerBuild() {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return false;
  const res = await fetch(hook, { method: 'POST' });
  return res.ok;
}

// Anzeigename und Instagram-Bereinigung liegen jetzt in squadra-rules.mjs (gemeinsam mit Build und Tests)
export { kurzName, cleanHandle } from './squadra-rules.mjs';

// Löscht ein Foto im privaten Speicher (Fehler werden nur protokolliert – die Zeile wird trotzdem bereinigt)
export async function sbRemove(bucket, path) {
  if (!path) return;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  try {
    const res = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/${bucket}`, {
      method: 'DELETE', headers: { ...keyHeaders(key), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] })
    });
    if (!res.ok) console.warn(`Foto ${bucket}/${path} nicht gelöscht (${res.status})`);
  } catch (e) { console.warn(`Foto ${bucket}/${path} nicht gelöscht:`, e.message); }
}

// ---------- Fotos: Metadaten entfernen (L5) ----------
// Entfernt EXIF/XMP/Kommentare usw. (Standort, Kamera, Datum) – in reinem JavaScript, ohne Neukodierung.
// JPEG: APP1…APP15 und COM raus, APP0/JFIF bleibt · PNG: tEXt/zTXt/iTXt/eXIf/tIME raus ·
// WebP: EXIF/XMP-Chunks raus, RIFF-Größe und VP8X-Flags angepasst. Unbekanntes/kaputtes Format → Fehler.
export class BildFehler extends Error {}

// JPEG (R3): Segmente werden auch nach jedem Scan weiter gelesen (progressive JPEGs haben mehrere Scans, dazwischen
// können APP-/COM-Segmente stehen). Behalten: APP0 (JFIF), APP2 nur „ICC_PROFILE“, APP14 nur „Adobe“ (Farben, keine
// persönlichen Daten). Alles andere an APPn/COM fällt weg, ebenso alles nach dem ersten EOI (angehängte Daten).
const startsWith = (buf, from, text) => buf.toString('latin1', from, from + text.length) === text;
function jpegBehalten(m, buf, data) {
  if (m === 0xfe) return false; // COM
  if (m === 0xe0) return true; // APP0
  if (m === 0xe2) return startsWith(buf, data, 'ICC_PROFILE\0');
  if (m === 0xee) return startsWith(buf, data, 'Adobe');
  if (m >= 0xe1 && m <= 0xef) return false;
  return true;
}
export function stripJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new BildFehler('kein JPEG');
  const out = [buf.subarray(0, 2)];
  let i = 2, eoi = false;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new BildFehler('JPEG-Struktur fehlerhaft');
    let j = i;
    while (j < buf.length && buf[j] === 0xff) j++; // Füllbytes
    if (j >= buf.length) throw new BildFehler('JPEG abgeschnitten');
    const m = buf[j];
    const seg = j + 1;
    if (m === 0xd9) { out.push(Buffer.from([0xff, 0xd9])); eoi = true; break; } // EOI – danach nichts mehr übernehmen
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { out.push(Buffer.from([0xff, m])); i = seg; continue; } // ohne Länge
    if (seg + 2 > buf.length) throw new BildFehler('JPEG abgeschnitten');
    const len = buf.readUInt16BE(seg);
    if (len < 2 || seg + len > buf.length) throw new BildFehler('JPEG-Segment fehlerhaft');
    if (jpegBehalten(m, buf, seg + 2)) out.push(Buffer.from([0xff, m]), buf.subarray(seg, seg + len));
    i = seg + len;
    if (m === 0xda) {
      // Bilddaten des Scans bis zum nächsten echten Marker (FF gefolgt von etwas anderem als 00, FF oder RST D0–D7)
      let k = i;
      while (k < buf.length) {
        if (buf[k] === 0xff && k + 1 < buf.length) {
          const n = buf[k + 1];
          if (n !== 0x00 && n !== 0xff && !(n >= 0xd0 && n <= 0xd7)) break;
        }
        k++;
      }
      out.push(buf.subarray(i, k));
      i = k;
    }
  }
  if (!eoi) throw new BildFehler('JPEG ohne Ende (EOI)');
  return Buffer.concat(out);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
export function stripPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) throw new BildFehler('kein PNG');
  const out = [PNG_SIG];
  let i = 8, ende = false;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw new BildFehler('PNG-Chunk fehlerhaft');
    if (!PNG_DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') { ende = true; break; }
  }
  if (!ende) throw new BildFehler('PNG ohne IEND');
  return Buffer.concat(out);
}

export function stripWebp(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new BildFehler('kein WebP');
  const riffEnd = Math.min(buf.length, 8 + buf.readUInt32LE(4));
  const chunks = [];
  let i = 12;
  while (i + 8 <= riffEnd) {
    const fourcc = buf.toString('latin1', i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size & 1);
    if (i + 8 + size > riffEnd) throw new BildFehler('WebP-Chunk fehlerhaft');
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      let c = Buffer.from(buf.subarray(i, Math.min(end, riffEnd)));
      if (c.length < 8 + size + (size & 1)) c = Buffer.concat([c, Buffer.alloc(8 + size + (size & 1) - c.length)]);
      if (fourcc === 'VP8X' && size >= 1) c[8] &= ~(0x08 | 0x04); // Flags: EXIF (E) und XMP (X) aus
      chunks.push(c);
    }
    i = end;
  }
  if (!chunks.length) throw new BildFehler('WebP ohne Bilddaten');
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(4 + body.length, 4);
  head.write('WEBP', 8, 'ascii');
  return Buffer.concat([head, body]);
}

export function stripMetadata(buf, type) {
  if (type === 'image/jpeg') return stripJpeg(buf);
  if (type === 'image/png') return stripPng(buf);
  if (type === 'image/webp') return stripWebp(buf);
  throw new BildFehler('Format nicht erlaubt');
}
