// © 2026 LBC3
// Nachts: Bild- und Video-Ereignisse der Vortage zu Tageszahlen zusammenfassen und die Einzel-Ereignisse löschen.
import { tag } from './_lib/besucher.mjs';
import { store, tagLesen, addieren } from './_lib/medien.mjs';

export default async () => {
  const heute = tag();
  const { blobs } = await store().list({ prefix: 'e/' });
  const tage = [...new Set(blobs.map((b) => b.key.split('/')[1]))].filter((d) => d < heute);
  for (const d of tage) {
    const { zahlen, keys } = await tagLesen(d);
    const alt = await store().get(`tag/${d}`, { type: 'json' }).catch(() => null);
    await store().setJSON(`tag/${d}`, addieren([alt, zahlen])); // schon teilweise verdichtet: addieren
    for (let i = 0; i < keys.length; i += 50) await Promise.all(keys.slice(i, i + 50).map((k) => store().delete(k)));
  }
  return new Response(`Verdichtet: ${tage.join(', ') || 'nichts'}`);
};

export const config = { schedule: '40 1 * * *' };
