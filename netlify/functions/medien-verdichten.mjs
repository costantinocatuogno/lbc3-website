// © 2026 LBC3
// Nachts: Bild- und Video-Ereignisse der Vortage zu Tageszahlen zusammenfassen und die Einzel-Ereignisse löschen.
// Jeder Tag wird genau einmal verdichtet: Gibt es tag/<d> schon, sind übrige Einzel-Ereignisse bereits mitgezählt
// (Rest eines abgebrochenen Laufs) und werden nur noch gelöscht – so wird nie doppelt gezählt.
import { tag } from './_lib/besucher.mjs';
import { store, tagLesen } from './_lib/medien.mjs';

export default async () => {
  const heute = tag();
  const { blobs } = await store().list({ prefix: 'e/' });
  const tage = [...new Set(blobs.map((b) => b.key.split('/')[1]))].filter((d) => d < heute);
  for (const d of tage) {
    const fertig = await store().get(`tag/${d}`, { type: 'json' }).catch(() => null);
    const { zahlen, keys } = await tagLesen(d);
    if (!fertig) await store().setJSON(`tag/${d}`, zahlen);
    for (let i = 0; i < keys.length; i += 50) await Promise.all(keys.slice(i, i + 50).map((k) => store().delete(k)));
  }
  // Tageszähler der Grenze für vergangene Tage löschen
  const { blobs: anz } = await store().list({ prefix: 'anzahl/' });
  await Promise.all(anz.filter((b) => b.key.slice(7) < heute).map((b) => store().delete(b.key)));
  return new Response(`Verdichtet: ${tage.join(', ') || 'nichts'}`);
};

export const config = { schedule: '40 1 * * *' };
