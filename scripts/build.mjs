// Build-Skript ohne externe Abhängigkeiten: erzeugt die fertige Website in /dist.
// Aufruf: node scripts/build.mjs   (Netlify führt das bei jeder Änderung automatisch aus)
import { rmSync, mkdirSync, cpSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, loadWall } from './lib/content.mjs';
import { LANGS, url, missingKeys } from './lib/i18n.mjs';
import { readdirSync, statSync } from 'node:fs';
import { home } from './templates/home.mjs';
import { baldPage, vorschauPage, baldRedirects, baldJs, vorschauJs } from './templates/bald.mjs';
import { newsList, newsDetail, ueber, kalender, galerie, galerieSerie, galerieJahr, galerieAlbum, partner, kontakt, rechtliches, message } from './templates/pages.mjs';
import { loginPage, berichtPage, teamPage } from './templates/secure.mjs';
import { squadra, wallPrint } from './templates/squadra.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CACHE = join(ROOT, '.cache');

const t0 = Date.now();
const siteUrl = (process.env.URL || process.env.SITE_URL || 'http://localhost:8888').replace(/\/$/, '');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, 'public'), DIST, { recursive: true });

// ---------- Externe Dateien einmalig laden und selbst hosten (DSGVO: keine Drittanbieter-Aufrufe der Besucher) ----------
const FONTS = [
  ['barlow-condensed', 600], ['barlow-condensed', 800], ['barlow-condensed', 900],
  ['manrope', 400], ['manrope', 500], ['manrope', 700]
];
const VENDOR = [
  ['supabase.js', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js']
];

async function fetchCached(name, src) {
  const cached = join(CACHE, name);
  if (existsSync(cached)) return readFileSync(cached);
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(cached), { recursive: true });
    writeFileSync(cached, buf);
    return buf;
  } catch (err) {
    console.warn(`⚠ Konnte ${name} nicht laden (${err.message}) – Ersatz wird verwendet.`);
    return null;
  }
}

let fontsOk = 0;
mkdirSync(join(DIST, 'fonts'), { recursive: true });
for (const [fam, w] of FONTS) {
  const file = `${fam}-latin-${w}-normal.woff2`;
  const buf = await fetchCached(`fonts/${file}`, `https://cdn.jsdelivr.net/npm/@fontsource/${fam}@5/files/${file}`);
  if (buf) { writeFileSync(join(DIST, 'fonts', file), buf); fontsOk++; }
}
mkdirSync(join(DIST, 'assets/vendor'), { recursive: true });
for (const [name, src] of VENDOR) {
  const buf = await fetchCached(`vendor/${name}`, src);
  writeFileSync(join(DIST, 'assets/vendor', name), buf || `/* ${name} konnte beim Build nicht geladen werden */ window.__supabaseMissing = true;`);
}

// Supabase-Adresse robust machen: Leerzeichen, Schrägstrich am Ende oder angehängte Pfade (/rest/v1 …) entfernen
function cleanSupabaseUrl(v) {
  const m = String(v || '').trim().match(/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)/i);
  if (!m && v) console.warn('⚠ SUPABASE_URL sieht ungewöhnlich aus – erwartet: https://xxxx.supabase.co');
  return m ? m[0] : String(v || '').trim().replace(/\/+$/, '');
}
process.env.SUPABASE_URL = cleanSupabaseUrl(process.env.SUPABASE_URL);

// Öffentliche Supabase-Zugangsdaten (anon key ist öffentlich; geschützt wird über Row-Level-Security).
writeFileSync(join(DIST, 'assets/js/config.js'), `window.LBC3_CONFIG = ${JSON.stringify({
  supabaseUrl: cleanSupabaseUrl(process.env.SUPABASE_URL),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  siteUrl
})};\n`);

// ---------- Inhalte ----------
const missing = missingKeys();
if (Object.keys(missing).length) {
  for (const [l, keys] of Object.entries(missing)) console.error(`✖ locales/${l}.json: es fehlen ${keys.length} Texte: ${keys.slice(0, 12).join(', ')}${keys.length > 12 ? ' …' : ''}`);
  process.exit(1);
}
const content = loadContent(ROOT);
const wall = await loadWall(content, DIST);
const version = Date.now().toString(36);

// ---------- Instagram: neueste Beiträge holen und Bilder selbst hosten (Besucher laden nichts von Instagram) ----------
async function loadInstagram() {
  const empty = { beitraege: [], partner: [] };
  if (!process.env.NETLIFY || !process.env.URL) return empty; // nur beim Bauen auf Netlify
  if (content.site.instagram_feed === false) return empty; // im CMS ausgeschaltet
  try {
    const res = await fetch(`${process.env.URL.replace(/\/$/, '')}/api/instagram-feed`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const feed = await res.json();
    const schutzWoerter = (content.glossar.schutz || []).map((x) => String(x || '').trim().toLowerCase()).filter((x) => x.length >= 3);
    // Startseite: die 4 neuesten nicht ausgeblendeten Beiträge · Partner-Seite: die 3 neuesten mit #LBC3Partner oder angehakt
    const ok = (feed.beitraege || []).filter((b) => !schutzWoerter.some((w) => String(b.text || '').toLowerCase().includes(w))); // Schutz von Luigi
    const wanted = [...ok.filter((b) => b.start !== false).slice(0, 6), ...ok.filter((b) => b.partner).slice(0, 5)];
    const saved = new Map();
    for (const b of wanted) {
      if (saved.has(b.id)) continue;
      try {
        const img = await fetch(b.bild);
        if (!img.ok) continue;
        const file = `insta/${String(b.id).replace(/[^0-9a-z_]/gi, '')}.jpg`;
        mkdirSync(join(DIST, 'insta'), { recursive: true });
        writeFileSync(join(DIST, file), Buffer.from(await img.arrayBuffer()));
        saved.set(b.id, { ...b, bild: `/${file}` });
      } catch { /* einzelnes Bild überspringen */ }
    }
    const pick = (fn, n) => wanted.filter(fn).map((b) => saved.get(b.id)).filter(Boolean).filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i).slice(0, n);
    const out = pick((b) => b.start !== false, 4);
    const partner = pick((b) => b.partner, 3);
    console.log(`  Instagram: ${out.length} Beiträge Startseite, ${partner.length} Partner-Seite`);
    return { konto: feed.konto || '', beitraege: out, partner };
  } catch (err) {
    console.warn('⚠ Instagram-Beiträge nicht geladen:', err.message);
    return empty;
  }
}
const instagram = await loadInstagram();
// Liste der Partner für den Klickzähler (/api/klick nimmt nur Klicks auf diese Namen an)
writeFileSync(join(DIST, 'partner-liste.json'), JSON.stringify({ partner: [...new Set([
  ...content.sponsoren.filter((s) => s.website && !/^\s*\[/.test(s.firma || '')).map((s) => String(s.firma).trim()),
  ...(wall.beispiel ? [] : wall.sponsoren.map((s) => String(s.firma || '').trim()))
].filter(Boolean))] }));
const ctx = { content, siteUrl, version };
const ctxFor = Object.fromEntries(LANGS.map((l) => [l, { content: l === 'de' ? content : loadContent(ROOT, l), siteUrl, version, wall, instagram }]));

const pages = [];
function out(path, htmlText) {
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, htmlText);
  pages.push(path);
}

const langPages = Object.fromEntries(LANGS.map((l) => [l, []]));
for (const lang of LANGS) {
  const ctx = ctxFor[lang];
  const start = pages.length;
  out(url(lang, '/'), home(lang, ctx));
  out(url(lang, '/news/'), newsList(lang, ctx));
  for (const n of ctx.content.news) out(url(lang, `/news/${n.slug}/`), newsDetail(lang, ctx, n));
  out(url(lang, '/ueber-luigi/'), ueber(lang, ctx));
  out(url(lang, '/kalender/'), kalender(lang, ctx));
  out(url(lang, '/galerie/'), galerie(lang, ctx));
  for (const se of ctx.content.serien) {
    out(url(lang, se.path), galerieSerie(lang, ctx, se));
    for (const j of se.jahre) out(url(lang, j.path), galerieJahr(lang, ctx, se, j));
  }
  for (const a of ctx.content.alben) out(url(lang, a.path), galerieAlbum(lang, ctx, a));
  out(url(lang, '/squadra-tre/'), squadra(lang, ctx, wall));
  out(url(lang, '/partner/'), partner(lang, ctx, wall));
  out(url(lang, '/kontakt/'), kontakt(lang, ctx));
  out(url(lang, '/impressum/'), rechtliches(lang, ctx, 'impressum'));
  out(url(lang, '/datenschutz/'), rechtliches(lang, ctx, 'datenschutz'));
  out(url(lang, '/danke/'), message(lang, ctx, { path: '/danke/', titleKey: 'thanks_title', textKey: 'thanks_text' }));
  out(url(lang, '/squadra-bestaetigt/'), message(lang, ctx, { path: '/squadra-bestaetigt/', titleKey: 'confirmed_title', textKey: 'confirmed_text' }));
  langPages[lang] = pages.slice(start);
}
out('/404.html', message('de', ctx, { path: '/404/', titleKey: 'not_found', textKey: 'back_home' }));
for (const l of LANGS) {
  out(url(l, '/login/'), loginPage(ctxFor[l], l));
  out(url(l, '/bericht/'), berichtPage(ctxFor[l], l));
}
out('/team/', teamPage(ctx));
out('/wall-of-fame/druck/', wallPrint(ctx, wall));
out('/bald/', baldPage(ctx));
out('/vorschau/', vorschauPage());
writeFileSync(join(DIST, 'bald/bald.js'), baldJs);
writeFileSync(join(DIST, 'vorschau/vorschau.js'), vorschauJs);

// ---------- Bald-Modus: Besucher sehen nur die „Bald geht's los“-Seite ----------
const baldModus = content.site.bald_modus === true;
if (baldModus) {
  writeFileSync(join(DIST, '_redirects'), baldRedirects());
  writeFileSync(join(DIST, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
}

// ---------- SEO: eine Sitemap je Sprache, jede Adresse mit ihren Sprachfassungen (hreflang) ----------
const isPublic = (p) => !/\/(login|bericht|team|danke|squadra-bestaetigt|wall-of-fame|bald|vorschau)\/|404/.test(p);
const stripLang = (p) => p.replace(/^\/(en|it|fr)(?=\/)/, '');
const alternatesXml = (p) => {
  const base = stripLang(p);
  return LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}${url(l, base)}"/>`).join('\n') +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${base}"/>`;
};
for (const lang of LANGS) {
  const list = langPages[lang].filter(isPublic);
  writeFileSync(join(DIST, `sitemap-${lang}.xml`), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${list.map((p) => `  <url>\n    <loc>${siteUrl}${p}</loc>\n${alternatesXml(p)}\n  </url>`).join('\n')}
</urlset>
`);
}
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LANGS.map((l) => `  <sitemap><loc>${siteUrl}/sitemap-${l}.xml</loc></sitemap>`).join('\n')}
</sitemapindex>
`);

// ---------- Schutz von Luigi: verbotene Angaben dürfen in keiner Sprachfassung stehen ----------
// Liste in content/einstellungen/glossar.json → "schutz". Impressum/Datenschutz sind ausgenommen (gesetzliche Anbieter-Angaben).
const schutz = (content.glossar.schutz || []).map((x) => String(x || '').trim()).filter((x) => x.length >= 3);
if (schutz.length) {
  const hits = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) { if (!/^(uploads|assets|fonts|admin|wall)$/.test(f)) walk(full); continue; }
      if (!f.endsWith('.html')) continue;
      const rel = full.slice(DIST.length).replace(/\\/g, '/');
      if (/\/(impressum|datenschutz)\//.test(rel)) continue;
      const text = readFileSync(full, 'utf8').toLowerCase();
      for (const w of schutz) if (text.includes(w.toLowerCase())) hits.push(`${rel}: „${w}“`);
    }
  };
  walk(DIST);
  if (hits.length) {
    console.error(`✖ Schutz von Luigi: geschützte Angaben gefunden – Build abgebrochen:\n  ${hits.slice(0, 20).join('\n  ')}`);
    process.exit(1);
  }
}

// KI-Crawler ausschließen (Nutzungsvorbehalt nach § 44b UrhG), Suchmaschinen bleiben erlaubt
const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'CCBot', 'Google-Extended', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Bytespider', 'Applebot-Extended', 'meta-externalagent', 'Amazonbot', 'cohere-ai', 'Diffbot'];
writeFileSync(join(DIST, 'robots.txt'), `${AI_BOTS.map((b) => `User-agent: ${b}\nDisallow: /\n`).join('\n')}
User-agent: *
Disallow: /admin/
Disallow: /login/
Disallow: /bericht/
${['it', 'en', 'fr'].map((l) => `Disallow: /${l}/login/\nDisallow: /${l}/bericht/`).join('\n')}
Disallow: /team/
Disallow: /wall-of-fame/
Sitemap: ${siteUrl}/sitemap.xml
`);

console.log(`${baldModus ? '⏳ Bald-Modus AN · ' : ''}✔ ${pages.length} Seiten erzeugt · Instagram: ${instagram.beitraege.length} Beiträge in ${Date.now() - t0} ms · Schriften: ${fontsOk}/${FONTS.length} · Wall of Fame: ${wall.beispiel ? 'Beispieldaten' : `${wall.mitglieder.length} Mitglieder, ${wall.sponsoren.length} Sponsoren`}`);
