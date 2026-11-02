// Besucherzählung ohne Cookies: Aus IP-Adresse + Browserkennung wird mit einem täglich neuen Zufallswert
// ein kurzer Kennwert gebildet. Die IP selbst wird nie gespeichert; die Kennwerte werden nachts zu Tageszahlen
// zusammengefasst und gelöscht. So lässt sich zählen, wie viele verschiedene Besucher pro Tag da waren.
import { getStore } from '@netlify/blobs';
import { createHash, randomBytes } from 'node:crypto';

export const store = () => getStore('besucher');
export const tag = (d = new Date()) => new Date(d.getTime() + 60 * 60 * 1000 * (isSommer(d) ? 2 : 1)).toISOString().slice(0, 10); // Tag nach deutscher Zeit
function isSommer(d) { // MESZ: letzter Sonntag im März bis letzter Sonntag im Oktober
  const y = d.getUTCFullYear();
  const last = (m) => { const x = new Date(Date.UTC(y, m + 1, 0, 1)); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); return x; };
  return d >= last(2) && d < last(9);
}

// Täglich neuer Zufallswert; er wird nachts zusammen mit den Kennwerten gelöscht
const cache = {};
export async function schluessel(day) {
  if (cache[day]) return cache[day];
  let s = await store().get(`salz/${day}`);
  if (!s) { s = randomBytes(32).toString('hex'); await store().set(`salz/${day}`, s); }
  cache[day] = s;
  return s;
}
export const kennwert = (secret, day, ip, ua) => createHash('sha256').update(`${secret}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);

export const leer = () => ({ aufrufe: 0, besucher: 0, seiten: {}, sprachen: {}, laender: {}, herkunft: {}, geraete: {} });
const plus = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };

// Ereignisse eines Tages zusammenfassen (Schlüssel: e/<tag>/<kennwert>/<zeit>)
export async function tagAuswerten(day) {
  const { blobs } = await store().list({ prefix: `e/${day}/` });
  const t = leer();
  const ids = new Set();
  for (let i = 0; i < blobs.length; i += 50) {
    await Promise.all(blobs.slice(i, i + 50).map(async (b) => {
      ids.add(b.key.split('/')[2]);
      const d = await store().get(b.key, { type: 'json' }).catch(() => null);
      t.aufrufe++;
      if (!d) return;
      plus(t.seiten, d.p); plus(t.sprachen, d.l); plus(t.laender, d.c); plus(t.herkunft, d.r); plus(t.geraete, d.g);
    }));
  }
  t.besucher = ids.size;
  return { zahlen: t, keys: blobs.map((b) => b.key) };
}
