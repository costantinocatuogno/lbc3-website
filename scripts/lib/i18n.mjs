import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Sprachen der Website. Deutsch liegt ohne Präfix unter /, die anderen unter /it/, /en/, /fr/.
// Alle festen Texte (Menüs, Knöpfe, Hinweise …) stehen in /locales/<sprache>.json – nichts fest im Code.
// Redaktionelle Texte (Hero, Kapitel, News, Bildunterschriften …) kommen aus /content und sind im CMS änderbar.

export const LANGS = ['de', 'it', 'en', 'fr'];
export const DEFAULT_LANG = 'de';
export const LANG_NAMES = { de: 'Deutsch', it: 'Italiano', en: 'English', fr: 'Français' };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function prefix(lang) {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

export function url(lang, path = '/') {
  return `${prefix(lang)}${path}`;
}

function loadLocale(lang) {
  const file = join(ROOT, 'locales', `${lang}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

export const ui = Object.fromEntries(LANGS.map((l) => [l, loadLocale(l)]));

export function t(lang) {
  const dict = ui[lang] || ui.de;
  return (key) => dict[key] ?? ui.de[key] ?? key;
}

// Prüft beim Build, ob jede Sprachdatei alle Schlüssel der deutschen Datei hat.
export function missingKeys() {
  const keys = Object.keys(ui.de);
  return Object.fromEntries(LANGS.filter((l) => l !== 'de').map((l) => [l, keys.filter((k) => !(k in ui[l]))]).filter(([, m]) => m.length));
}

// Übersetztes Feld lesen: feld_<sprache> oder Block <sprache>.feld, sonst das Original
// (Quelle = Sprache, in der geschrieben wurde).
const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';
export function locValue(obj, field, lang) {
  if (!obj) return undefined;
  const flat = obj[`${field}_${lang}`];
  if (filled(flat)) return flat;
  const block = obj[lang] && typeof obj[lang] === 'object' ? obj[lang][field] : undefined;
  return filled(block) ? block : undefined;
}
export function loc(obj, field, lang, source = DEFAULT_LANG) {
  if (!obj) return undefined;
  if (lang === source) return obj[field];
  return locValue(obj, field, lang) ?? obj[field];
}

export const DATE_LOCALE = { de: 'de-DE', en: 'en-GB', it: 'it-IT', fr: 'fr-FR' };
export const OG_LOCALE = { de: 'de_DE', en: 'en_GB', it: 'it_IT', fr: 'fr_FR' };

export function formatDate(iso, lang, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(DATE_LOCALE[lang] || 'de-DE', { timeZone: 'Europe/Berlin', ...opts });
}

export function formatNumber(n, lang, opts = {}) {
  return Number(n).toLocaleString(DATE_LOCALE[lang] || 'de-DE', opts);
}

// Rundenzeiten sind im Motorsport international gleich: 1:02.345 (Minuten:Sekunden.Tausendstel).
export function formatLap(ms) {
  const v = Number(ms);
  if (!Number.isFinite(v) || v <= 0) return '';
  const m = Math.floor(v / 60000);
  const s = ((v % 60000) / 1000).toFixed(3).padStart(6, '0');
  return m ? `${m}:${s}` : s;
}
