// HTML-Helfer: Escaping, Bild-URLs (Netlify Image CDN), Icons.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Template-Tag: Arrays werden zusammengefügt, null/undefined/false ausgelassen.
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (Array.isArray(v)) out += v.join('');
      else if (v === null || v === undefined || v === false) out += '';
      else out += v;
    }
  });
  return out;
}

// Auf Netlify werden Bilder über das Image CDN in passender Größe und als WebP/AVIF ausgeliefert.
const USE_CDN = !!process.env.NETLIFY && process.env.LBC3_IMAGE_CDN !== 'off';

export function img(src, width) {
  if (!src) return '';
  if (!USE_CDN || !src.startsWith('/') || src.endsWith('.svg')) return src;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=78`;
}

export function srcset(src, widths = [480, 800, 1200, 1600]) {
  if (!USE_CDN || !src || !src.startsWith('/')) return '';
  return widths.map((w) => `${img(src, w)} ${w}w`).join(', ');
}

// Responsives <img> mit lazy loading.
export function picture(src, alt, { width = 1200, sizes = '100vw', cls = '', eager = false, style = '' } = {}) {
  if (!src) return '';
  const set = srcset(src);
  return `<img src="${esc(img(src, width))}"${set ? ` srcset="${esc(set)}" sizes="${esc(sizes)}"` : ''} alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export const icon = {
  instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>',
  lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg>',
  prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>',
  facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z"/></svg>',
  linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3.3 9h3.4v11.5H3.3zM9 9h3.3v1.6h.1c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.2 2.3 4.2 5.3v6.4h-3.4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.8H9z"/></svg>',
  tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.1c-1.5 0-2.8-.4-4-1.2v6.1c0 3.4-2.6 5.9-5.8 5.9S5 18.2 5 15c0-3.3 2.8-5.9 6.2-5.6v3.2c-1.5-.3-3 .7-3 2.4 0 1.4 1.1 2.5 2.6 2.5 1.6 0 2.6-1.1 2.6-2.9V3z"/></svg>',
  youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

export function flagsDE() {
  return '<span class="flag" aria-hidden="true"><i style="background:#000"></i><i style="background:#C8102E"></i><i style="background:#E0B000"></i></span>';
}
export function flagsIT() {
  return '<span class="flag" aria-hidden="true"><i style="background:#1E8E3E"></i><i style="background:#F2F3F5;outline:1px solid #D6D8DC"></i><i style="background:#C8102E"></i></span>';
}
