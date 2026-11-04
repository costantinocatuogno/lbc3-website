// © 2026 LBC3
// Reine Rechenfunktionen des Aufrufzählers für Bilder und Videos (ohne Speicherzugriff – dadurch einfach testbar).
export const SPRACHEN = ['de', 'it', 'en', 'fr'];
export const ARTEN = { bild: ['auf'], video: ['start', 'ende'] };

/** Eingang prüfen. Gibt { m, a, l } zurück oder null, wenn das Ereignis nicht gezählt wird. */
export function pruefeEreignis(b, erlaubt) {
  if (!b || typeof b !== 'object') return null;
  const m = String(b.m || '').slice(0, 300);
  const typ = /\.(mp4|webm|mov)$/i.test(m) ? 'video' : 'bild';
  if (!erlaubt || !erlaubt.has(m)) return null;
  if (!ARTEN[typ].includes(b.a)) return null;
  const l = SPRACHEN.includes(b.l) ? b.l : 'de';
  return { m, a: b.a, l };
}

/** Ereignisse zu Zahlen je Datei zusammenfassen: { "<datei>": { n, e, l: { de: n, … } } } (n = geöffnet/gestartet, e = zu Ende). */
export function zusammenfassen(ereignisse, basis = {}) {
  const z = JSON.parse(JSON.stringify(basis || {}));
  for (const d of ereignisse) {
    if (!d || !d.m) continue;
    const x = z[d.m] ||= { n: 0, e: 0, l: {} };
    if (d.a === 'ende') x.e++;
    else { x.n++; x.l[d.l] = (x.l[d.l] || 0) + 1; }
  }
  return z;
}

/** Tageszahlen mehrerer Tage addieren. */
export function addieren(tage) {
  const z = {};
  for (const t of tage) for (const [m, x] of Object.entries(t || {})) {
    const y = z[m] ||= { n: 0, e: 0, l: {} };
    y.n += x.n || 0; y.e += x.e || 0;
    for (const [l, n] of Object.entries(x.l || {})) y.l[l] = (y.l[l] || 0) + n;
  }
  return z;
}
