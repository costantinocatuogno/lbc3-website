// © 2026 LBC3
// Liste aller Bauteile der Website (Seiten, Artikel, Galerie-Seiten, Bilder, Videos) für den Aufrufzähler.
// Wird beim Build aus den fertigen deutschen Seiten gelesen – so landet jedes neue Bild/Video automatisch in der Liste.
// Ergebnis: dist/bauteile.json (öffentlich; enthält nur, was auf der Website ohnehin sichtbar ist).

const SPRACH_PREFIX = /^\/(en|it|fr)(?=\/|$)/;

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Sprache einer Adresse (de, it, en, fr). */
export function spracheVon(p) {
  const m = String(p || '').match(SPRACH_PREFIX);
  return m ? m[1] : 'de';
}

/** Adresse einer Seite ohne Sprachkürzel, ohne ?/#, immer mit Schrägstrich am Ende ("/it/news/x" → "/news/x/"). */
export function seitenPfad(p) {
  let s = String(p || '/').split(/[?#]/)[0].replace(SPRACH_PREFIX, '') || '/';
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.endsWith('/index.html')) s = s.slice(0, -10);
  if (!s.endsWith('/') && !/\.[a-z0-9]+$/i.test(s)) s += '/';
  return s;
}

/** Datei-Adresse eines Bildes/Videos, auch wenn es über die Netlify-Bildverkleinerung geladen wird. '' wenn ungültig. */
export function medienPfad(src) {
  let s = decode(src).trim();
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname + new URL(s).search;
    if (s.startsWith('/.netlify/images')) s = new URLSearchParams(s.split('?')[1] || '').get('url') || '';
  } catch { return ''; }
  s = s.split(/[?#]/)[0];
  try { s = decodeURI(s); } catch { /* bleibt */ }
  return /^\/uploads\/[^<>"'\n]+\.(jpe?g|png|webp|avif|gif|mp4|webm|mov)$/i.test(s) && !s.includes('..') ? s : '';
}

export const istVideo = (p) => /\.(mp4|webm|mov)$/i.test(p);

/** Art einer Seite: Artikel (News-Beitrag), Galerie (Alben) oder Seite. */
export function seitenTyp(p) {
  if (/^\/news\/[^/]+\/$/.test(p)) return 'artikel';
  if (/^\/galerie\//.test(p)) return 'galerie';
  return 'seite';
}

const dateiName = (p) => decodeURIComponent(p.split('/').pop() || p).replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? decode(m[1]) : null; };

/**
 * Bauteile aus den fertigen Seiten lesen.
 * @param {{pfad: string, html: string}[]} seiten – deutsche, öffentliche Seiten
 * @returns {{typ: string, id: string, titel: string, seite: string}[]}
 */
export function bauteileAusSeiten(seiten) {
  const liste = [];
  const medien = new Map();
  const merke = (id, titel, seite) => {
    if (!id) return;
    const alt = medien.get(id);
    if (!alt) medien.set(id, { typ: istVideo(id) ? 'video' : 'bild', id, titel: titel || '', seite });
    else if (!alt.titel && titel) alt.titel = titel;
  };
  for (const { pfad, html } of seiten) {
    const id = seitenPfad(pfad);
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
    const titel = decode(t || '').replace(/\s*·\s*LBC3 Luigi Battista Catuogno$/, '').trim() || id;
    liste.push({ typ: seitenTyp(id), id, titel: id === '/' ? 'Startseite' : titel, seite: id });
    // Großansicht (Bilder und Galerie-Videos)
    for (const tag of html.match(/<button\b[^>]*\bdata-lightbox-index="[^"]*"[^>]*>/g) || []) {
      const titelM = (attr(tag, 'data-caption') || '').split(' · ')[0].trim();
      merke(medienPfad(attr(tag, 'data-full')), titelM, id);
    }
    // Reels
    for (const tag of html.match(/<button\b[^>]*\bdata-reel-src="[^"]*"[^>]*>/g) || []) merke(medienPfad(attr(tag, 'data-reel-src')), attr(tag, 'data-reel-titel'), id);
    // Videos mit Bedienelementen (das Intro und stumme Vorschaubilder ohne „controls“ zählen nicht)
    for (const m of html.matchAll(/<video\b([^>]*)>[\s\S]*?(?:<\/video>)/g)) {
      const tag = `<video${m[1]}>`;
      if (!/\scontrols[\s>]/.test(tag) || /data-intro-video/.test(tag)) continue;
      const after = html.slice(m.index + m[0].length, m.index + m[0].length + 400);
      const cap = (after.match(/^\s*<figcaption>\s*<strong>([^<]*)<\/strong>/) || [])[1];
      merke(medienPfad(attr(tag, 'src')), cap ? decode(cap) : '', id);
    }
  }
  for (const m of medien.values()) liste.push({ ...m, titel: m.titel || dateiName(m.id) });
  // Seiten doppelt (z. B. gleiche Adresse) zusammenfassen
  const seen = new Set();
  return liste.filter((x) => { const k = `${x.typ}|${x.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
