// POST (öffentlich): ein Seitenaufruf. GET (nur Admins): Besucherzahlen für den Team-Bereich.
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';
import { store, tag, schluessel, kennwert, tagAuswerten, leer } from './_lib/besucher.mjs';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|monitor|pingdom|uptime/i;
const geraet = (ua) => (/ipad|tablet/i.test(ua) ? 'Tablet' : /mobile|iphone|android/i.test(ua) ? 'Handy' : 'Computer');

export default handle(async (req, context) => {
  if (req.method === 'POST') {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
    let b = {};
    try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch { return new Response(null, { status: 204 }); }
    const p = String(b.p || '/').split(/[?#]/)[0].slice(0, 200);
    if (/^\/(team|admin|bericht|login|vorschau)(\/|$)/.test(p)) return new Response(null, { status: 204 });
    const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
    const day = tag();
    const id = kennwert(await schluessel(day), day, ip, ua);
    let r = '';
    try { const h = new URL(String(b.r || '')).hostname.replace(/^www\./, ''); if (h && !/luigi-catuogno\.com$|netlify\.app$/.test(h)) r = h.slice(0, 80); } catch { /* keine Herkunft */ }
    const d = { p, l: ['de', 'it', 'en', 'fr'].includes(b.l) ? b.l : 'de', c: String(context?.geo?.country?.code || '').slice(0, 2), r: r || 'direkt', g: geraet(ua) };
    await store().setJSON(`e/${day}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, d);
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Nicht erlaubt.');
  await requireAdmin(req);
  const tage = Math.min(Math.max(Number(new URL(req.url).searchParams.get('tage')) || 30, 1), 400);
  const heute = tag();
  const liste = [];
  for (let i = tage - 1; i >= 0; i--) liste.push(tag(new Date(Date.now() - i * 864e5)));
  const out = {};
  await Promise.all(liste.map(async (d) => {
    if (d === heute) { out[d] = (await tagAuswerten(d)).zahlen; return; }
    out[d] = (await store().get(`tag/${d}`, { type: 'json' })) || (await tagAuswerten(d)).zahlen || leer();
  }));
  return json({ heute, tage: liste.map((d) => ({ tag: d, ...out[d] })) });
});

export const config = { path: '/api/besuch' };
