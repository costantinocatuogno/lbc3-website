// Klickzähler für Partner-Links.
// POST (öffentlich): ein Klick – nur Partnername, Stelle, Sprache und Zeit; keine IP, keine Cookies.
// GET (nur Admins): Auswertung eines Jahres für den Team-Bereich.
import { getStore } from '@netlify/blobs';
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';

const store = () => getStore('klicks');
const QUELLEN = /^(laufband|partnerseite|wall|wall-(instagram|facebook|linkedin|tiktok|youtube))$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|monitor/i;

// Erlaubte Partnernamen aus der beim Build erzeugten Liste (10 Minuten zwischengespeichert)
let liste = null;
let listeStand = 0;
async function partnerListe(req) {
  if (liste && Date.now() - listeStand < 10 * 60 * 1000) return liste;
  const base = process.env.URL || new URL(req.url).origin;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/partner-liste.json`);
    const d = await res.json();
    liste = new Set((d.partner || []).map((x) => String(x).trim()));
    listeStand = Date.now();
  } catch { liste = liste || new Set(); }
  return liste;
}

export default handle(async (req) => {
  if (req.method === 'POST') {
    if (BOT.test(req.headers.get('user-agent') || '')) return new Response(null, { status: 204 });
    let b = {};
    try { b = JSON.parse((await req.text()).slice(0, 1000)); } catch { return new Response(null, { status: 204 }); }
    const p = String(b.p || '').trim().slice(0, 120);
    const q = QUELLEN.test(b.q) ? b.q : 'sonstige';
    const l = ['de', 'it', 'en', 'fr'].includes(b.l) ? b.l : 'de';
    if (!p || !(await partnerListe(req)).has(p)) return new Response(null, { status: 204 });
    const now = new Date();
    // Ein Eintrag pro Klick (keine Konflikte bei gleichzeitigen Klicks)
    const key = `${now.getUTCFullYear()}/${now.toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
    await store().setJSON(key, { p, q, l });
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Nicht erlaubt.');
  await requireAdmin(req);
  const jahr = Number(new URL(req.url).searchParams.get('jahr')) || new Date().getUTCFullYear();
  const { blobs } = await store().list({ prefix: `${jahr}/` });
  const partner = {};
  const seit30 = Date.now() - 30 * 24 * 3600 * 1000;
  const lesen = async (b) => {
    const d = await store().get(b.key, { type: 'json' });
    if (!d) return;
    const zeit = b.key.slice(5, 29);
    const x = partner[d.p] ||= { klicks: 0, letzte30: 0, monate: {}, quellen: {}, sprachen: {} };
    x.klicks++;
    if (new Date(zeit).getTime() >= seit30) x.letzte30++;
    const m = zeit.slice(5, 7);
    x.monate[m] = (x.monate[m] || 0) + 1;
    x.quellen[d.q] = (x.quellen[d.q] || 0) + 1;
    x.sprachen[d.l] = (x.sprachen[d.l] || 0) + 1;
  };
  for (let i = 0; i < blobs.length; i += 50) await Promise.all(blobs.slice(i, i + 50).map(lesen));
  return json({ jahr, gesamt: blobs.length, partner });
});

export const config = { path: '/api/klick' };
