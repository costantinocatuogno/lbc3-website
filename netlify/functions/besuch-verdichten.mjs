// Nachts: Ereignisse der Vortage zu Tageszahlen zusammenfassen und die Einzel-Kennwerte löschen.
import { store, tag, tagAuswerten } from './_lib/besucher.mjs';

export default async () => {
  const heute = tag();
  const { blobs } = await store().list({ prefix: 'e/' });
  const tage = [...new Set(blobs.map((b) => b.key.split('/')[1]))].filter((d) => d < heute);
  for (const d of tage) {
    const { zahlen, keys } = await tagAuswerten(d);
    const alt = await store().get(`tag/${d}`, { type: 'json' });
    if (alt) { // schon teilweise verdichtet: addieren
      zahlen.aufrufe += alt.aufrufe; zahlen.besucher += alt.besucher;
      for (const k of ['seiten', 'sprachen', 'laender', 'herkunft', 'geraete']) for (const [x, n] of Object.entries(alt[k] || {})) zahlen[k][x] = (zahlen[k][x] || 0) + n;
    }
    await store().setJSON(`tag/${d}`, zahlen);
    for (let i = 0; i < keys.length; i += 50) await Promise.all(keys.slice(i, i + 50).map((k) => store().delete(k)));
  }
  // Zufallswerte vergangener Tage löschen – danach lassen sich die Kennwerte nicht mehr nachbilden
  const { blobs: salze } = await store().list({ prefix: 'salz/' });
  await Promise.all(salze.filter((b) => b.key.slice(5) < heute).map((b) => store().delete(b.key)));
  return new Response(`Verdichtet: ${tage.join(', ') || 'nichts'}`);
};

export const config = { schedule: '30 1 * * *' };
