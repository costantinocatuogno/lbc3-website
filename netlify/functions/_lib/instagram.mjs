// Instagram-Anbindung (offizielle Instagram-API mit Instagram-Login).
// Der Zugangsschlüssel liegt nur serverseitig im Netlify-Speicher (Blobs), nie im Browser oder im Repository.
import { getStore } from '@netlify/blobs';

const GRAPH = 'https://graph.instagram.com';
export const store = () => getStore('instagram');

export async function getToken() {
  return (await store().get('token', { type: 'json' })) || null;
}
export async function saveToken(data) {
  await store().setJSON('token', { ...data, gespeichert_am: new Date().toISOString() });
}

export async function ig(path, token, params = {}) {
  const u = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', token);
  const res = await fetch(u);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data?.error?.message || `Instagram antwortet mit ${res.status}`);
  return data;
}

export const me = (token) => ig('/me', token, { fields: 'user_id,username' });
export const refresh = (token) => ig('/refresh_access_token', token, { grant_type: 'ig_refresh_token' });

export async function media(token, limit = 12) {
  const d = await ig('/me/media', token, { fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp', limit: String(limit) });
  return (d.data || []).map((m) => ({
    id: m.id, typ: m.media_type, link: m.permalink, datum: m.timestamp,
    text: String(m.caption || '').slice(0, 600),
    bild: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url
  })).filter((m) => m.bild && m.link);
}

// Auswahl im Team-Bereich: welche Beiträge auf Startseite und Partner-Seite erscheinen.
// Partner-Seite: automatisch alle Beiträge mit #LBC3Partner in der Bildunterschrift – plus von Hand angehakte.
export const PARTNER_TAG = '#lbc3partner';
export async function getAuswahl() {
  const a = (await store().get('auswahl', { type: 'json' })) || {};
  return { ausblenden: a.ausblenden || [], partner: a.partner || [], partner_aus: a.partner_aus || [] };
}
export async function saveAuswahl(a) {
  const ids = (x) => [...new Set((Array.isArray(x) ? x : []).map((v) => String(v).replace(/[^0-9a-z_]/gi, '')).filter(Boolean))].slice(0, 200);
  const clean = { ausblenden: ids(a.ausblenden), partner: ids(a.partner), partner_aus: ids(a.partner_aus), stand: new Date().toISOString() };
  await store().setJSON('auswahl', clean);
  return clean;
}
export function applyAuswahl(posts, a) {
  return posts.map((p) => {
    const tag = String(p.text || '').toLowerCase().includes(PARTNER_TAG);
    const id = String(p.id);
    return { ...p, start: !a.ausblenden.includes(id), partner_tag: tag, partner: !a.partner_aus.includes(id) && (tag || a.partner.includes(id)) };
  });
}
