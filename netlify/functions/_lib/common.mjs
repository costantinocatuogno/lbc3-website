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
      const detail = String(err && (err.message || err)).replace(/(key|token|secret)=\S+/gi, '$1=…').slice(0, 160);
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

export async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${env('SUPABASE_URL')}${path}`, { method, headers: sbHeaders(headers), body: body ? JSON.stringify(body) : undefined });
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
  if (!token) throw new HttpError(401, 'Nicht angemeldet.');
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new HttpError(401, 'Sitzung abgelaufen – bitte neu anmelden.');
  const user = await res.json();
  const rows = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=rolle`);
  if (!rows?.[0] || rows[0].rolle !== 'admin') throw new HttpError(403, 'Nur für Admins.');
  return user;
}

// ---------- E-Mail über Brevo (EU) ----------
export async function sendMail({ to, subject, html, attachmentUrl, attachmentName }) {
  const body = {
    sender: { email: env('MAIL_FROM'), name: process.env.MAIL_FROM_NAME || 'LBC3 · Luigi Battista Catuogno' },
    replyTo: { email: process.env.MAIL_REPLY_TO || env('MAIL_FROM') },
    to: Array.isArray(to) ? to : [to],
    subject,
    htmlContent: html
  };
  if (attachmentUrl) body.attachment = [{ url: attachmentUrl, name: attachmentName || 'jahresbericht.pdf' }];
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env('BREVO_API_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    let m = ''; try { m = JSON.parse(t).message || ''; } catch { m = t.slice(0, 120); }
    throw new HttpError(502, `E-Mail-Versand fehlgeschlagen (Brevo ${res.status}${m ? ': ' + m : ''}).`);
  }
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

// Öffentlicher Anzeigename: Vorname + Initiale ("Marco Rossi" → "Marco R.")
export function kurzName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export const cleanHandle = (s) => String(s || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);
