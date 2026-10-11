// Lädt alle Inhalte aus /content (vom Decap CMS gepflegt) und berechnet abgeleitete Daten.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listDir(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(ext)).sort();
}

// News im Format "json-frontmatter": JSON-Objekt am Anfang, danach Markdown.
function readJsonFrontmatter(path) {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('{')) return { data: {}, body: raw };
  let depth = 0, inStr = false, escNext = false, end = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr) {
      if (escNext) escNext = false;
      else if (c === '\\') escNext = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const data = JSON.parse(trimmed.slice(0, end + 1));
  return { data, body: trimmed.slice(end + 1).trim() };
}

const pick = (obj, lang) => ({ ...(obj?.de || {}), ...(obj?.[lang] || {}) });

export function loadContent(root) {
  const C = join(root, 'content');
  const site = readJSON(join(C, 'einstellungen/site.json'));
  const texte = readJSON(join(C, 'einstellungen/texte.json'));
  const fahrer = readJSON(join(C, 'einstellungen/fahrer.json'));
  const wandBeispiel = existsSync(join(C, 'einstellungen/squadra-wand-beispiel.json'))
    ? readJSON(join(C, 'einstellungen/squadra-wand-beispiel.json')).namen || []
    : [];

  const news = listDir(join(C, 'news'), '.md')
    .map((f) => {
      const { data, body } = readJsonFrontmatter(join(C, 'news', f));
      return { slug: basename(f, extname(f)), ...data, body };
    })
    .filter((n) => !n.entwurf)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  const rennen = listDir(join(C, 'rennen'), '.json')
    .map((f) => ({ id: basename(f, '.json'), ...readJSON(join(C, 'rennen', f)) }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));

  const alben = listDir(join(C, 'alben'), '.json')
    .map((f) => ({ slug: basename(f, '.json'), ...readJSON(join(C, 'alben', f)) }))
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  const kapitel = listDir(join(C, 'kapitel'), '.json')
    .map((f) => readJSON(join(C, 'kapitel', f)))
    .sort((a, b) => String(a.de?.nummer).localeCompare(String(b.de?.nummer)));

  const sponsoren = listDir(join(C, 'sponsoren'), '.json')
    .map((f) => readJSON(join(C, 'sponsoren', f)))
    .filter((s) => s.aktiv !== false)
    .sort((a, b) => (a.reihenfolge ?? 99) - (b.reihenfolge ?? 99));

  const pakete = listDir(join(C, 'pakete'), '.json')
    .map((f) => readJSON(join(C, 'pakete', f)))
    .sort((a, b) => (a.reihenfolge ?? 99) - (b.reihenfolge ?? 99));

  // Statistik aus gefahrenen Rennen
  const gefahren = rennen.filter((r) => r.status === 'gefahren');
  const finals = gefahren.map((r) => Number(r.finale)).filter((n) => Number.isFinite(n) && n > 0);
  const stats = {
    rennen: gefahren.length,
    podien: finals.filter((n) => n <= 3).length,
    siege: finals.filter((n) => n === 1).length,
    beste: finals.length ? Math.min(...finals) : null,
    laender: new Set(rennen.map((r) => r.land).filter(Boolean)).size || 1
  };

  const upcoming = rennen
    .filter((r) => r.status === 'bevorstehend')
    .map((r) => ({ start: r.start, strecke: r.strecke, serie: r.serie, klasse: r.klasse, land: r.land }));

  const saisons = [...new Set(rennen.map((r) => Number(r.saison)).filter(Boolean))].sort((a, b) => a - b);

  return {
    site, fahrer, kapitel, news, rennen, alben, sponsoren, pakete, stats, upcoming, saisons, wandBeispiel,
    texte: (lang) => pick(texte, lang),
    fahrerFor: (lang) => pick(fahrer, lang),
    kapitelFor: (lang) => kapitel.map((k) => pick(k, lang)),
    highlights: news.filter((n) => n.highlight)
  };
}

// Namen für die "Wand der Squadra Tre" – nur bestätigte Mitglieder mit Einwilligung.
// Beim Build auf Netlify aus Supabase geladen; ohne Zugangsdaten werden Beispielnamen verwendet.
// Wall of Fame: lädt beim Build die freigegebenen Squadra-3-Mitglieder und Sponsoren-Einträge
// und kopiert NUR freigegebene Fotos/Logos aus dem privaten Supabase-Speicher nach dist/wall/.
// Ohne Supabase-Zugang (lokal) werden Beispieldaten gezeigt.
export async function loadWall(content, distDir) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const beispiel = () => ({
    beispiel: true,
    mitglieder: content.wandBeispiel.map((name) => ({ name, foto: null })),
    sponsoren: content.sponsoren.map((s) => ({ firma: s.firma, logo: s.logo || null, website: s.website || '', paket: s.paket || '', text: '', social: {} }))
  });
  if (!base || !key) return beispiel();
  const headers = key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (path) => {
    const res = await fetch(`${base}${path}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const download = async (bucket, path, target) => {
    try {
      const res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(join(distDir, dirname(target)), { recursive: true });
      writeFileSync(join(distDir, target), buf);
      return '/' + target;
    } catch (err) {
      console.warn(`⚠ Bild ${bucket}/${path} nicht geladen:`, err.message);
      return null;
    }
  };
  try {
    const rows = await get('/rest/v1/squadra_tre?select=id,name,angezeigter_name,foto_pfad,foto_freigegeben,mitgliedschaft&optin_bestaetigt=eq.true&wand_optin=eq.true&ausgeblendet=eq.false&order=bestaetigt_am.asc.nullslast');
    const mitglieder = [];
    for (const r of rows) {
      let foto = null;
      if (r.foto_pfad && r.foto_freigegeben) foto = await download('squadra', r.foto_pfad, `wall/squadra/${r.id}${extname(r.foto_pfad)}`);
      mitglieder.push({ name: r.angezeigter_name || r.name, foto, unterstuetzer: r.mitgliedschaft === 'unterstuetzer' });
    }
    const sp = await get('/rest/v1/sponsor_wall?select=*&freigegeben=eq.true&order=created_at.asc');
    const sponsoren = [];
    for (const s of sp) {
      const logo = s.logo_pfad ? await download('sponsoren', s.logo_pfad, `wall/sponsoren/${s.id}${extname(s.logo_pfad)}`) : null;
      sponsoren.push({
        firma: s.firma, logo, website: s.website, paket: s.paket || '', text: s.text || '',
        social: Object.fromEntries(['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'].filter((k) => s[k]).map((k) => [k, s[k]]))
      });
    }
    return { beispiel: false, mitglieder, sponsoren };
  } catch (err) {
    console.warn('⚠ Wall of Fame konnte nicht geladen werden:', err.message);
    return beispiel();
  }
}
