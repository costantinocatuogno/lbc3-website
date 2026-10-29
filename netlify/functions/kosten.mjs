// Kostenrechner im Team-Bereich: Einsätze (Rennen & Training) und weitere Ausgaben je Saison speichern (nur Admins).
// Liegt im Netlify-Speicher (Blobs), nicht im öffentlichen Repository. Die Summen je Kategorie
// schreibt der Team-Bereich zusätzlich wie bisher in Supabase (Tabelle „ausgaben“) – die sehen Partner nach Freigabe.
import { getStore } from '@netlify/blobs';
import { handle, json, requireAdmin, readBody, HttpError } from './_lib/common.mjs';

const store = () => getStore('kosten');
const n = (v, max = 1e7) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };
const s = (v, max = 120) => String(v ?? '').slice(0, max);

function clean(d) {
  const e = d && typeof d === 'object' ? d : {};
  const p = e.preise || {};
  return {
    preise: { diesel: n(p.diesel, 10), verbrauch: n(p.verbrauch, 100), reifen: n(p.reifen, 5000), benzin: n(p.benzin, 20), verpflegung: n(p.verpflegung, 1000) },
    einsaetze: (Array.isArray(e.einsaetze) ? e.einsaetze : []).slice(0, 120).map((x) => ({
      art: x.art === 'training' ? 'training' : 'rennen',
      ort: s(x.ort), termin: s(x.termin, 60), notiz: s(x.notiz, 300),
      km: n(x.km, 5000), reifen: n(x.reifen, 50), tage: n(x.tage, 30), benzin: n(x.benzin, 500),
      nenngeld: n(x.nenngeld, 1e5), training: n(x.training, 1e5), entsorgung: n(x.entsorgung, 1e5),
      geschaetzt: x.geschaetzt !== false
    })),
    weitere: Object.fromEntries(Object.entries(e.weitere || {}).slice(0, 30).map(([k, v]) => [s(k, 80), n(v)])),
    stand: new Date().toISOString()
  };
}

export default handle(async (req) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const saison = Number(new URL(req.url).searchParams.get('saison'));
    if (!Number.isInteger(saison) || saison < 2020 || saison > 2100) throw new HttpError(400, 'Saison fehlt.');
    return json({ daten: (await store().get(String(saison), { type: 'json' })) || null });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Nicht erlaubt.');
  const b = await readBody(req);
  const saison = Number(b.saison);
  if (!Number.isInteger(saison) || saison < 2020 || saison > 2100) throw new HttpError(400, 'Saison fehlt.');
  const daten = clean(b.daten);
  await store().setJSON(String(saison), daten);
  return json({ ok: true, daten });
});

export const config = { path: '/api/kosten' };
