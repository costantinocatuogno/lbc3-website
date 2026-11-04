// © 2026 LBC3
// Aufrufzähler für Bilder und Videos.
// POST (öffentlich): ein Ereignis – Bild in der Großansicht geöffnet, Video gestartet oder zu Ende geschaut.
//   Nur Datei, Art und Sprache; keine IP-Adresse, keine Cookies. Angenommen werden nur Dateien aus /bauteile.json.
// GET (nur Admins): Zahlen je Datei für den Team-Bereich (Reiter „Aufrufe“).
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';
import { tag } from './_lib/besucher.mjs';
import { store, pruefeEreignis, tagLesen, addieren } from './_lib/medien.mjs';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|monitor|pingdom|uptime/i;

// Erlaubte Dateien aus der beim Build erzeugten Liste (10 Minuten zwischengespeichert)
let liste = null;
let listeStand = 0;
async function erlaubteMedien(req) {
  if (liste && Date.now() - listeStand < 10 * 60 * 1000) return liste;
  const base = process.env.URL || new URL(req.url).origin;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/bauteile.json`);
    const d = await res.json();
    liste = new Set((d.bauteile || []).filter((x) => x.typ === 'bild' || x.typ === 'video').map((x) => x.id));
    listeStand = Date.now();
  } catch { liste = liste || new Set(); }
  return liste;
}

export default handle(async (req) => {
  if (req.method === 'POST') {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
    let b = {};
    try { b = JSON.parse((await req.text()).slice(0, 1000)); } catch { return new Response(null, { status: 204 }); }
    const e = pruefeEreignis(b, await erlaubteMedien(req));
    if (!e) return new Response(null, { status: 204 });
    // Ein Eintrag pro Ereignis (keine Konflikte bei gleichzeitigen Aufrufen)
    await store().setJSON(`e/${tag()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, e);
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Nicht erlaubt.');
  await requireAdmin(req);
  const tage = Math.min(Math.max(Number(new URL(req.url).searchParams.get('tage')) || 30, 1), 400);
  const heute = tag();
  const liste = [];
  for (let i = tage - 1; i >= 0; i--) liste.push(tag(new Date(Date.now() - i * 864e5)));
  const werte = await Promise.all(liste.map(async (d) => {
    const fertig = d === heute ? null : await store().get(`tag/${d}`, { type: 'json' }).catch(() => null);
    // Tage, die noch nicht verdichtet sind: Rohereignisse dazuzählen
    const roh = (d === heute || !fertig) ? (await tagLesen(d)).zahlen : null;
    return addieren([fertig, roh]);
  }));
  return json({ heute, von: liste[0], bis: heute, medien: addieren(werte) });
});

export const config = { path: '/api/medien' };
