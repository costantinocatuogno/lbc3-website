// Persönliche Instagram-Einladungen zur Squadra Tre (nur Instagram-Name, Sprache, Datum – keine weiteren Daten).
import { getStore } from '@netlify/blobs';
import { cleanHandle } from './common.mjs';

const store = () => getStore('squadra-einladungen');
export async function liste() { return (await store().get('liste', { type: 'json' })) || []; }
async function speichern(l) { await store().setJSON('liste', l.slice(-2000)); }

export async function hinzufuegen(handle, sprache) {
  const h = cleanHandle(handle).toLowerCase();
  if (!h) return null;
  const l = await liste();
  const alt = l.find((x) => x.h === h);
  if (alt) { alt.zuletzt = new Date().toISOString(); alt.s = sprache; alt.n = (alt.n || 1) + 1; }
  else l.push({ h, s: sprache, am: new Date().toISOString(), n: 1 });
  await speichern(l);
  return h;
}
export async function entfernen(handle) {
  const h = cleanHandle(handle).toLowerCase();
  await speichern((await liste()).filter((x) => x.h !== h));
}
// Aufruf bei einer Anmeldung über einen Einladungslink (?ref=<instagram-name>)
export async function angemeldet(ref) {
  const h = cleanHandle(ref).toLowerCase();
  if (!h) return;
  const l = await liste();
  const e = l.find((x) => x.h === h);
  if (!e || e.angemeldet) return;
  e.angemeldet = new Date().toISOString();
  await speichern(l);
}
