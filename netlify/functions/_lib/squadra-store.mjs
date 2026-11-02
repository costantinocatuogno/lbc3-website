// Squadra Tre – Ablage in Netlify Blobs: Pins (Reihenfolge auf der Wall) und Zähler für das Rate-Limit.
import { getStore } from '@netlify/blobs';

export async function pinsLesen() {
  try { return (await getStore('squadra').get('pins', { type: 'json' })) || []; } catch (err) { console.warn('Pins nicht geladen:', err.message); return []; }
}

// Entfernt gelöschte Mitglieder aus der Pin-Liste
export async function pinsEntfernen(ids) {
  const weg = new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean));
  if (!weg.size) return;
  try {
    const store = getStore('squadra');
    const pins = (await store.get('pins', { type: 'json' })) || [];
    if (pins.some((x) => weg.has(x))) await store.setJSON('pins', pins.filter((x) => !weg.has(x)));
  } catch (err) { console.warn('Pin nicht entfernt:', err.message); }
}

// Alte Rate-Limit-Zähler löschen (Schlüssel: ip:<JJJJ-MM-TTTHH>:… bzw. mail:<JJJJ-MM-TT>:…)
export async function limitsAufraeumen(now = Date.now()) {
  let n = 0;
  try {
    const store = getStore('squadra-limit');
    const grenze = new Date(now - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { blobs } = await store.list();
    for (const { key } of blobs || []) {
      const datum = String(key).split(':')[1] || '';
      if (datum.slice(0, 10) < grenze) { await store.delete(key); n++; }
    }
  } catch (err) { console.warn('Rate-Limit-Zähler nicht aufgeräumt:', err.message); }
  return n;
}
