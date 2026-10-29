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
