// © 2026 LBC3
// Aufrufzähler für Bilder und Videos.
// POST (öffentlich): ein Ereignis – Bild in der Großansicht geöffnet, Video gestartet oder zu Ende geschaut.
//   Nur Datei, Art und Sprache; keine IP-Adresse, keine Cookies. Angenommen werden nur Dateien aus /bauteile.json.
// GET (nur Admins): Zahlen je Datei für den Team-Bereich (Reiter „Aufrufe“).
import { handle, json, requireAdmin, HttpError } from './_lib/common.mjs';
import { tag } from './_lib/besucher.mjs';
import { randomBytes } from 'node:crypto';
import { store, pruefeEreignis, tagLesen, addieren, tageListe, TAGES_GRENZE } from './_lib/medien.mjs';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|monitor|pingdom|uptime/i;

// Erlaubte Dateien aus der beim Build erzeugten Liste derselben Fassung (Live oder Vorschau), 10 Minuten zwischengespeichert.
// Schlägt der Abruf fehl, wird es erst nach 1 Minute erneut versucht.
let liste = null;
let listeStand = 0;
let listeGueltig = 0;
async function erlaubteMedien(req) {
  if (liste && Date.now() - listeStand < listeGueltig) return liste;
  const base = new URL(req.url).origin || process.env.URL || '';
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/bauteile.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    liste = new Set((d.bauteile || []).filter((x) => x.typ === 'bild' || x.typ === 'video').map((x) => x.id));
    listeGueltig = 10 * 60 * 1000;
  } catch { liste = liste || new Set(); listeGueltig = 60 * 1000; }
  listeStand = Date.now();
  return liste;
}

// Grenze pro Tag (ungefähr; gleichzeitige Aufrufe können sie leicht überschreiten)
async function unterGrenze(day) {
  const n = Number(await store().get(`anzahl/${day}`).catch(() => 0)) || 0;
  if (n >= TAGES_GRENZE) return false;
  await store().set(`anzahl/${day}`, String(n + 1));
  return true;
}

export default handle(async (req) => {
  if (req.method === 'POST') {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
    let b = {};
    try { b = JSON.parse((await req.text()).slice(0, 1000)); } catch { return new Response(null, { status: 204 }); }
    const e = pruefeEreignis(b, await erlaubteMedien(req));
    if (!e) return new Response(null, { status: 204 });
    const day = tag();
    if (!(await unterGrenze(day))) return new Response(null, { status: 204 });
    // Ein Eintrag pro Ereignis, Schlüssel nur Tag + Zufallswert (keine Uhrzeit)
    await store().setJSON(`e/${day}/${randomBytes(8).toString('hex')}`, e);
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Nicht erlaubt.');
  await requireAdmin(req);
  const tage = Math.min(Math.max(Number(new URL(req.url).searchParams.get('tage')) || 30, 1), 400);
  const heute = tag();
  const liste = tageListe(heute, tage);
  const werte = await Promise.all(liste.map(async (d) => {
    const fertig = d === heute ? null : await store().get(`tag/${d}`, { type: 'json' }).catch(() => null);
    // Tage, die noch nicht verdichtet sind: Rohereignisse dazuzählen
    const roh = (d === heute || !fertig) ? (await tagLesen(d)).zahlen : null;
    return addieren([fertig, roh]);
  }));
  return json({ heute, von: liste[0], bis: heute, medien: addieren(werte) });
});

export const config = { path: '/api/medien' };
