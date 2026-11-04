// © 2026 LBC3
// Aufrufzähler für Bilder und Videos – anonym: keine IP-Adresse, keine Cookies, nichts im Browser gespeichert.
// Gespeichert wird je Ereignis nur: Datei, Art (Bild geöffnet / Video gestartet / Video zu Ende) und Sprache.
// Nachts werden die Ereignisse eines Tages zu Tageszahlen zusammengefasst (Schlüssel tag/<JJJJ-MM-TT>).
import { getStore } from '@netlify/blobs';

export const store = () => getStore('medien');
import { zusammenfassen } from './medien-zahlen.mjs';
export { SPRACHEN, ARTEN, pruefeEreignis, zusammenfassen, addieren, tageListe, TAGES_GRENZE } from './medien-zahlen.mjs';

/** Rohereignisse eines Tages lesen (Schlüssel e/<tag>/<zufall>). */
export async function tagLesen(day) {
  const { blobs } = await store().list({ prefix: `e/${day}/` });
  const ereignisse = [];
  for (let i = 0; i < blobs.length; i += 50) {
    const teil = await Promise.all(blobs.slice(i, i + 50).map((b) => store().get(b.key, { type: 'json' }).catch(() => null)));
    ereignisse.push(...teil);
  }
  return { zahlen: zusammenfassen(ereignisse), keys: blobs.map((b) => b.key) };
}
