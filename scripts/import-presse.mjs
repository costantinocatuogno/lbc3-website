// Presseberichte übernehmen: Für jeden Beitrag der Kategorie „Presse“ mit Link wird der Artikel einmal abgerufen.
// Übernommen werden Überschrift, Anrisstext, Zeitung und Datum – den vollständigen Text nur, wenn im CMS
// „Abdruck genehmigt“ angehakt ist (Urheberrecht: eine Übersetzung ist eine Bearbeitung und braucht die Erlaubnis der Zeitung).
// Bilder der Zeitung werden nie kopiert. Danach übersetzt scripts/translate.mjs in die anderen Sprachen.
//
// Läuft in der GitHub Action vor der Übersetzung. Aufruf lokal: node scripts/import-presse.mjs [--dry]
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonFrontmatter, writeJsonFrontmatter } from './lib/content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/news');
const DRY = process.argv.includes('--dry');
const LANGS = ['de', 'it', 'en', 'fr'];
const filled = (v) => typeof v === 'string' && v.trim() !== '';
const MAX_TEASER = 320;

const decode = (s) => String(s || '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, '’')
  .replace(/&lsquo;|&#8216;/g, '‘').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;|&#8212;/g, '—').replace(/&hellip;|&#8230;/g, '…')
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = (s) => decode(String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();

function meta(html, ...names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (filled(c)) return decode(c).trim();
  }
  return '';
}

function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1].trim());
      const walk = (x) => { if (!x) return; if (Array.isArray(x)) x.forEach(walk); else if (typeof x === 'object') { out.push(x); if (x['@graph']) walk(x['@graph']); } };
      walk(d);
    } catch { /* kaputtes JSON-LD ignorieren */ }
  }
  return out.find((x) => /Article|NewsArticle|Report|BlogPosting/i.test(String(x['@type']))) || null;
}

// Fließtext: zuerst articleBody aus den strukturierten Daten, sonst die Absätze im <article>-Bereich
function articleText(html, ld) {
  if (ld && filled(ld.articleBody)) return ld.articleBody.split(/\n{1,}/).map((p) => strip(p)).filter((p) => p.length > 30);
  const area = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
  return [...area.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((p) => p.length > 40 && !/cookie|newsletter|abonn|iscriviti|subscribe|©/i.test(p));
}

const shorten = (s, max) => (s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, '')} …`);

async function importOne(file) {
  const p = join(DIR, file);
  const { data, body } = readJsonFrontmatter(p);
  if (data.kategorie !== 'Presse' || !filled(data.quelle_url)) return null;
  const fullWanted = data.abdruck_erlaubt === true;
  // Schon übernommen? Nur erneut, wenn „Neu übernehmen“ angehakt ist oder nachträglich der Abdruck genehmigt wurde
  const again = data.neu_uebernehmen === true || (fullWanted && data.importiert === 'auszug');
  if (data.importiert && !again) return null;

  let url;
  try { url = new URL(data.quelle_url.trim()); } catch { data.uebersetzung_hinweis = 'Link zum Artikel ist ungültig.'; return { p, data, body, msg: 'ungültiger Link' }; }
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LBC3-Presse/1.0; +https://luigi-catuogno.com)', 'Accept-Language': 'de,it,en,fr' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    data.uebersetzung_hinweis = `Artikel konnte nicht abgerufen werden (${err.message}). Bitte Titel und Text selbst eintragen oder später „Neu übernehmen“ anhaken.`;
    data.importiert = 'fehler';
    return { p, data, body, msg: `Abruf fehlgeschlagen: ${err.message}` };
  }

  const ld = jsonLd(html);
  const title = strip(ld?.headline || meta(html, 'og:title', 'twitter:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const desc = strip(ld?.description || meta(html, 'og:description', 'description', 'twitter:description'));
  const site = strip(meta(html, 'og:site_name') || ld?.publisher?.name || url.hostname.replace(/^www\./, ''));
  const date = String(ld?.datePublished || meta(html, 'article:published_time', 'datePublished', 'date') || '').slice(0, 10);
  const langGuess = String(html.match(/<html[^>]+lang=["']([a-z]{2})/i)?.[1] || '').toLowerCase();

  if (!filled(data.titel) || again) data.titel = title || data.titel || site;
  if (!filled(data.teaser) || again) data.teaser = shorten(desc, MAX_TEASER);
  if (!filled(data.quelle_name)) data.quelle_name = site;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) { data.quelle_datum = date; if (!filled(data.datum)) data.datum = date; }
  if (!filled(data.datum)) data.datum = new Date().toISOString().slice(0, 10);
  if (!LANGS.includes(data.sprache) && LANGS.includes(langGuess)) data.sprache = langGuess;

  let newBody = body;
  if (fullWanted) {
    const paras = articleText(html, ld);
    if (paras.length) { newBody = paras.join('\n\n'); data.importiert = 'voll'; }
    else { data.importiert = 'auszug'; data.uebersetzung_hinweis = 'Der Artikeltext konnte nicht automatisch gelesen werden (z. B. Bezahlschranke). Bitte den Text selbst einfügen.'; }
  } else {
    newBody = ''; // ohne Genehmigung kein Fließtext – nur Überschrift, Anriss und Link
    data.importiert = 'auszug';
  }
  // Übersetzungen neu erzeugen lassen
  data.neu_uebersetzen = true;
  data.neu_uebernehmen = false;
  return { p, data, body: newBody, msg: `${site}: „${shorten(title, 60)}“ (${data.importiert === 'voll' ? 'ganzer Artikel' : 'Anriss + Link'})` };
}

const results = [];
if (existsSync(DIR)) {
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
    const r = await importOne(f);
    if (!r) continue;
    if (!DRY) writeJsonFrontmatter(r.p, r.data, r.body);
    results.push(r.msg);
  }
}
console.log(results.length ? results.map((m) => `  ✔ Presse: ${m}`).join('\n') : '  Keine neuen Presseberichte.');
