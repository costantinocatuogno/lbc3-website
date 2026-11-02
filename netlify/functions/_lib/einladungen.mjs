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

// ---------- E-Mail-Einladungen (E-Mail, Name, Sprache, Datum, Weg) ----------
export async function mailListe() { return (await store().get('mail', { type: 'json' })) || []; }
export async function mailMerken(email, name, sprache, weg) {
  const l = await mailListe();
  const e = l.find((x) => x.e === email);
  const jetzt = new Date().toISOString();
  if (e) { e.zuletzt = jetzt; e.n = (e.n || 1) + 1; e.w = weg; e.s = sprache; if (name) e.name = name; }
  else l.push({ e: email, name: name || '', s: sprache, w: weg, am: jetzt, n: 1 });
  await store().setJSON('mail', l.slice(-2000));
}
export async function mailEntfernen(email) { await store().setJSON('mail', (await mailListe()).filter((x) => x.e !== email)); }
// Wie viele Einladungen wurden heute direkt gesendet? (Schutz vor Versehen und Spam)
export async function heuteGesendet() {
  const tag = new Date().toISOString().slice(0, 10);
  return (await mailListe()).filter((x) => x.w === 'direkt' && String(x.zuletzt || x.am).startsWith(tag)).length;
}
