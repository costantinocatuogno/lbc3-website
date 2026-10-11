// Build-Skript ohne externe Abhängigkeiten: erzeugt die fertige Website in /dist.
// Aufruf: node scripts/build.mjs   (Netlify führt das bei jeder Änderung automatisch aus)
import { rmSync, mkdirSync, cpSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, loadWall } from './lib/content.mjs';
import { LANGS, url } from './lib/i18n.mjs';
import { home } from './templates/home.mjs';
import { newsList, newsDetail, ueber, kalender, galerie, partner, kontakt, rechtliches, message } from './templates/pages.mjs';
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
const content = loadContent(ROOT);
const wall = await loadWall(content, DIST);
const ctx = { content, siteUrl, version: Date.now().toString(36) };

const pages = [];
function out(path, htmlText) {
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, htmlText);
  pages.push(path);
}

for (const lang of LANGS) {
  out(url(lang, '/'), home(lang, ctx));
  out(url(lang, '/news/'), newsList(lang, ctx));
  for (const n of content.news) out(url(lang, `/news/${n.slug}/`), newsDetail(lang, ctx, n));
  out(url(lang, '/ueber-luigi/'), ueber(lang, ctx));
  out(url(lang, '/kalender/'), kalender(lang, ctx));
  out(url(lang, '/galerie/'), galerie(lang, ctx));
  out(url(lang, '/squadra-3/'), squadra(lang, ctx, wall));
  out(url(lang, '/partner/'), partner(lang, ctx, wall));
  out(url(lang, '/kontakt/'), kontakt(lang, ctx));
  out(url(lang, '/impressum/'), rechtliches(lang, ctx, 'impressum'));
  out(url(lang, '/datenschutz/'), rechtliches(lang, ctx, 'datenschutz'));
  out(url(lang, '/danke/'), message(lang, ctx, { path: '/danke/', titleKey: 'thanks_title', textKey: 'thanks_text' }));
  out(url(lang, '/squadra-bestaetigt/'), message(lang, ctx, { path: '/squadra-bestaetigt/', titleKey: 'confirmed_title', textKey: 'confirmed_text' }));
}
out('/404.html', message('de', ctx, { path: '/404/', titleKey: 'not_found', textKey: 'back_home' }));
out('/login/', loginPage(ctx));
out('/bericht/', berichtPage(ctx));
out('/team/', teamPage(ctx));
out('/wall-of-fame/druck/', wallPrint(ctx, wall));

// ---------- SEO ----------
const publicPages = pages.filter((p) => !/\/(login|bericht|team|danke|squadra-bestaetigt|wall-of-fame)\/|404/.test(p));
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages.map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *
Disallow: /admin/
Disallow: /login/
Disallow: /bericht/
Disallow: /team/
Disallow: /wall-of-fame/
Sitemap: ${siteUrl}/sitemap.xml
`);

console.log(`✔ ${pages.length} Seiten erzeugt in ${Date.now() - t0} ms · Schriften: ${fontsOk}/${FONTS.length} · Wall of Fame: ${wall.beispiel ? 'Beispieldaten' : `${wall.mitglieder.length} Mitglieder, ${wall.sponsoren.length} Sponsoren`}`);
