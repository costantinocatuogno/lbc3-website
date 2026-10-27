// Automatische Übersetzung neuer Inhalte (läuft als GitHub Action nach jedem Speichern im CMS).
// Übersetzt nur, was noch fehlt – Korrekturen von Hand werden nie überschrieben.
// Ausnahme: News mit Häkchen „Neu übersetzen“ werden komplett neu übersetzt.
//
// Was übersetzt wird:
//   • News (Titel, Kurztext, Text) aus der Original-Sprache (Deutsch oder Italienisch) in die drei anderen Sprachen
//   • Galerie: Bildunterschriften (text_it/_en/_fr) sowie Albumtitel, Serie „Hinter den Kulissen“ usw.
//   • Videos (Titel, Kurztext), Helm-Bildunterschriften, Seitentexte, Kapitel, Steckbrief, Partner-Pakete
//   • Impressum und Datenschutz nur, wenn noch gar keine Übersetzung existiert (danach von Hand pflegen)
//
// Glossar (content/einstellungen/glossar.json): Namen, Serien und Strecken bleiben unverändert,
// Fachbegriffe: Der Lauf meldet, wenn die festgelegte Übersetzung nicht vorkommt (dann im CMS kurz anpassen).
//
// Dienst (kostenlos, ohne Konto): MyMemory (Translated srl, Rom). Optional per Umgebungsvariable:
//   DEEPL_API_KEY  → DeepL (Köln)    ·    AZURE_TRANSLATOR_KEY + AZURE_TRANSLATOR_REGION → Microsoft Azure
//   MYMEMORY_EMAIL → höheres Gratis-Kontingent bei MyMemory (50.000 statt 5.000 Zeichen pro Tag)
// Aufruf:  node scripts/translate.mjs            (übersetzt und schreibt die Dateien)
//          node scripts/translate.mjs --dry      (zeigt nur, was übersetzt würde)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readJsonFrontmatter, writeJsonFrontmatter } from './lib/content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = join(ROOT, 'content');
const LANGS = ['de', 'it', 'en', 'fr'];
const DRY = process.argv.includes('--dry');
const filled = (v) => typeof v === 'string' && v.trim() !== '';
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJSON = (p, d) => writeFileSync(p, JSON.stringify(d, null, 2) + '\n');

// Kontakt-Adresse der Website für MyMemory (erhöht das Gratis-Kontingent auf 50.000 Zeichen pro Tag)
const SITE = readJSON(join(C, 'einstellungen/site.json'));
const MM_EMAIL = process.env.MYMEMORY_EMAIL || SITE.kontakt_email || '';
const glossar = existsSync(join(C, 'einstellungen/glossar.json')) ? readJSON(join(C, 'einstellungen/glossar.json')) : {};
const NIE = (glossar.nie_uebersetzen || []).filter(filled).sort((a, b) => b.length - a.length);
const FACH = (glossar.fachbegriffe || []).filter((f) => f && filled(f.de));

/* ---------------- Dienste ---------------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const providers = {
  // DeepL: Developer-/Growth-Schlüssel. Schlüssel mit „:fx“ am Ende laufen über den Gratis-Server.
  async deepl(texts, from, to) {
    const key = process.env.DEEPL_API_KEY;
    const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const target = { en: 'EN-GB', it: 'IT', fr: 'FR', de: 'DE' }[to];
    const res = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, source_lang: from.toUpperCase(), target_lang: target, tag_handling: 'xml', preserve_formatting: true })
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.translations.map((t) => t.text);
  },
  async azure(texts, from, to) {
    const res = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${from}&to=${to}&textType=html`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY, 'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION || 'westeurope', 'Content-Type': 'application/json' },
      body: JSON.stringify(texts.map((Text) => ({ Text })))
    });
    if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.map((d) => d.translations[0].text);
  },
  // MyMemory: max. 500 Byte pro Anfrage – längere Texte werden satzweise aufgeteilt
  async mymemory(texts, from, to) {
    const out = [];
    for (const text of texts) {
      const parts = splitBytes(text, 450);
      const done = [];
      for (const part of parts) {
        const u = new URL('https://api.mymemory.translated.net/get');
        u.searchParams.set('q', part);
        u.searchParams.set('langpair', `${from}|${to}`);
        if (MM_EMAIL) u.searchParams.set('de', MM_EMAIL);
        const res = await fetch(u);
        if (!res.ok) throw new Error(`MyMemory ${res.status}`);
        const data = await res.json();
        const t = data?.responseData?.translatedText || '';
        if (Number(data.responseStatus) !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) throw new Error(`MyMemory: ${t || data.responseDetails || data.responseStatus}`);
        done.push(t);
        await new Promise((r) => setTimeout(r, 250)); // freundlich zum Gratis-Dienst
      }
      out.push(done.join(' '));
    }
    return out;
  },
  // Nur für Tests: markiert den Text, statt ihn zu übersetzen
  async test(texts, from, to) {
    return texts.map((t) => `[${to}] ${t}`);
  }
};

const PROVIDER = process.env.TRANSLATE_PROVIDER || (process.env.DEEPL_API_KEY ? 'deepl' : process.env.AZURE_TRANSLATOR_KEY ? 'azure' : 'mymemory');

function splitBytes(text, max) {
  if (Buffer.byteLength(text) <= max) return [text];
  const sentences = text.match(/[^.!?…]+[.!?…]+["“”»«)]*\s*|[^.!?…]+$/g) || [text];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if (Buffer.byteLength(cur + s) > max && cur) { out.push(cur.trim()); cur = ''; }
    if (Buffer.byteLength(s) > max) {
      // sehr langer Satz: an Kommas/Leerzeichen teilen
      let rest = s;
      while (Buffer.byteLength(rest) > max) {
        let cut = rest.lastIndexOf(' ', Math.floor(max / 2));
        if (cut < 20) cut = Math.floor(max / 2);
        // nie mitten in einem Schutz-Platzhalter <x id="…"/> trennen
        const lt = rest.lastIndexOf('<', cut);
        if (lt > rest.lastIndexOf('>', cut) && lt > 0) cut = lt;
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut);
      }
      cur = rest;
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ---------------- Schutz: Glossar, Links, Platzhalter ---------------- */
// Ersetzt geschützte Stellen durch <x id="n"/>, damit der Dienst sie nicht verändert.
function protect(text, from, to, strict = false) {
  const keep = [];
  const token = (value) => { keep.push(value); return `\u0000${keep.length - 1}\u0000`; };
  let s = text;
  // Markdown-Links: Linkziel schützen, Linktext übersetzen
  s = s.replace(/\]\(([^)\s]+)\)/g, (m, href) => `](${token(href)})`);
  // Platzhalter wie [DETAILS] oder [TEXT ZUM QUALIFYING]
  s = s.replace(/\[[A-ZÄÖÜ][A-ZÄÖÜ0-9 :,?–\-]{2,}\]/g, (m) => token(m));
  // Hashtags, E-Mail-Adressen, Webadressen
  s = s.replace(/#[\p{L}0-9_]+/gu, (m) => token(m));
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => token(m));
  s = s.replace(/https?:\/\/\S+/g, (m) => token(m));
  // Nie übersetzen – nur im zweiten Versuch fest geschützt (Platzhalter verschlechtern sonst den Satzbau)
  if (strict) for (const term of NIE) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu');
    s = s.replace(re, (m) => token(m));
  }
  const xml = esc(s).replace(/\u0000(\d+)\u0000/g, '<x id="$1"/>');
  return { xml, keep };
}

function restore(xml, keep) {
  const missing = [];
  let s = xml.replace(/<x\s+id\s*=\s*"(\d+)"\s*\/?>(?:<\/x>)?/gi, (m, n) => (keep[Number(n)] ?? ''));
  keep.forEach((v, i) => { if (!xml.match(new RegExp(`<x\\s+id\\s*=\\s*"${i}"`, 'i'))) missing.push(v); });
  s = unesc(s).replace(/\s+([,.;:!?])(?=\s|$)/g, (m, p) => (/[:;!?]/.test(p) ? m : p));
  return { text: s, missing };
}

/* ---------------- Übersetzen ---------------- */
// Lohnt sich eine Übersetzung? Nicht bei reinen Zahlen oder Texten, die nur aus Glossar-Namen bestehen
// (z. B. „ADAC Kart Masters Ampfing 2026“) – dort zeigt die Website automatisch das Original.
function worth(text) {
  if (!filled(text)) return false;
  let s = String(text);
  for (const term of NIE) s = s.split(term).join(' ');
  return /\p{L}{2,}/u.test(s.replace(/#[\p{L}0-9_]+/gu, ' '));
}

let chars = 0;
const warnings = [];
const cache = new Map();

const present = (hay, term) => hay.toLowerCase().includes(term.toLowerCase());

async function runOnce(text, from, to, strict) {
  const { xml, keep } = protect(text, from, to, strict);
  const [out] = await providers[PROVIDER]([xml], from, to);
  const { text: result, missing } = restore(out, keep);
  const lost = NIE.filter((t) => present(text, t) && !present(result, t));
  return { result, missing, lost };
}

async function translateText(text, from, to) {
  if (!filled(text) || from === to) return text;
  const key = `${from}|${to}|${text}`;
  if (cache.has(key)) return cache.get(key);
  chars += text.length;
  if (DRY) { cache.set(key, `[${to}] ${text}`); return `[${to}] ${text}`; }
  // 1. Versuch: natürlicher Satz. Ging ein Glossar-Name verloren, 2. Versuch mit fest geschützten Namen.
  let r = await runOnce(text, from, to, false);
  if (r.lost.length) {
    const r2 = await runOnce(text, from, to, true);
    if (r2.lost.length <= r.lost.length && !r2.missing.length) r = r2;
  }
  if (r.missing.length) {
    // Links oder Platzhalter gingen kaputt: lieber den Originalsatz behalten als einen beschädigten Link speichern
    const r3 = await runOnce(text, from, to, true);
    if (!r3.missing.length) r = r3;
    else {
      warnings.push(`Nicht übersetzt (${to}), Link/Platzhalter wäre beschädigt worden – bitte von Hand übersetzen: „${text.slice(0, 60)}…“`);
      cache.set(key, text);
      return text;
    }
  }
  if (r.lost.length) warnings.push(`Glossar prüfen (${to}): ${r.lost.slice(0, 3).join(', ')} – in „${text.slice(0, 50)}…“`);
  // Fachbegriffe: Hinweis, wenn die festgelegte Übersetzung nicht vorkommt
  for (const f of FACH) {
    if (filled(f[from]) && filled(f[to]) && present(text, f[from]) && !present(r.result, f[to])) {
      warnings.push(`Fachbegriff prüfen (${to}): „${f[from]}“ sollte „${f[to]}“ heißen – in „${text.slice(0, 50)}…“`);
    }
  }
  cache.set(key, r.result);
  return r.result;
}

// Markdown blockweise übersetzen; Überschriften-, Listen- und Zitatzeichen bleiben erhalten
async function translateMarkdown(md, from, to) {
  if (!filled(md)) return md;
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (const line of lines) {
    if (!line.trim()) { out.push(line); continue; }
    const m = line.match(/^(\s*(?:#{1,6}\s+|[-*]\s+|\d+[.)]\s+|>\s?)?)(.*)$/);
    const pre = m[1] || '';
    const body = m[2] || '';
    // Bilder ![alt](src) nicht anfassen
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(body)) { out.push(line); continue; }
    out.push(pre + await translateText(body, from, to));
  }
  return out.join('\n');
}

const others = (src) => LANGS.filter((l) => l !== src);
const changed = new Set();
const log = [];

/* ---------------- News ---------------- */
// Prüfsumme: erkennt, ob sich das Original seit der letzten Übersetzung geändert hat
const hash = (...parts) => createHash('sha1').update(parts.map((x) => String(x ?? '')).join('\u0001')).digest('hex').slice(0, 12);
const blockHash = (b) => hash(b.titel, b.teaser, b.text);

async function doNews() {
  const dir = join(C, 'news');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const p = join(dir, f);
    const { data, body } = readJsonFrontmatter(p);
    const src = LANGS.includes(data.sprache) ? data.sprache : 'de';
    const force = data.neu_uebersetzen === true;
    const srcHash = hash(data.titel, data.teaser, body);
    let touched = false;
    const w0 = warnings.length;
    for (const to of others(src)) {
      const block = { ...(data[to] || {}) };
      // Original geändert? Automatische Übersetzung (unverändert) → neu übersetzen.
      // Von Hand korrigierte Übersetzung → nicht überschreiben, nur Hinweis.
      let redo = force;
      if (!force && block._quelle && block._quelle !== srcHash) {
        if (block._auto && block._auto === blockHash(block)) redo = true;
        else warnings.push(`News „${data.titel}“ (${to}): Das Original wurde geändert, die Übersetzung ist von Hand angepasst – bitte prüfen oder „Neu übersetzen“ anhaken.`);
      }
      const need = (k) => redo || !filled(block[k]);
      let did = false;
      if (filled(data.titel) && need('titel')) { block.titel = await translateText(data.titel, src, to); did = true; }
      if (filled(data.teaser) && need('teaser')) { block.teaser = await translateText(data.teaser, src, to); did = true; }
      if (filled(body) && need('text')) { block.text = await translateMarkdown(body, src, to); did = true; }
      if (did) { block._auto = blockHash(block); touched = true; }
      if (block._quelle !== srcHash && (did || !block._quelle)) { block._quelle = srcHash; touched = true; }
      data[to] = block;
    }
    // Hinweise direkt im Beitrag anzeigen (Feld „Hinweis zur Übersetzung“ im CMS)
    const hinweis = warnings.slice(w0).map((w) => w.replace(/^News „[^“]*“ /, '')).join(' · ').slice(0, 900);
    if ((data.uebersetzung_hinweis || '') !== hinweis && (touched || hinweis || data.uebersetzung_hinweis)) {
      if (hinweis) data.uebersetzung_hinweis = hinweis; else delete data.uebersetzung_hinweis;
      touched = true;
    }
    if (touched || force) {
      if (force) data.neu_uebersetzen = false;
      if (!DRY) writeJsonFrontmatter(p, data, body);
      changed.add(`content/news/${f}`); log.push(`News „${data.titel}“ → ${others(src).join(', ')}`);
    }
  }
}

/* ---------------- Galerie ---------------- */
async function doAlben() {
  const dir = join(C, 'alben');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = join(dir, f);
    const a = readJSON(p);
    let n = 0;
    for (const b of a.bilder || []) {
      if (!b || !worth(b.text)) continue;
      for (const to of others('de')) {
        if (!filled(b[`text_${to}`])) {
          b[`text_${to}`] = await translateText(b.text, 'de', to); n++;
        }
      }
    }
    // Albumtexte: Titel immer; Serie/Strecke nur, wenn sie kein Eigenname aus dem Glossar sind
    const isName = (v) => NIE.some((t) => t.toLowerCase() === String(v || '').trim().toLowerCase());
    for (const to of others('de')) {
      const block = { ...(a[to] || {}) };
      for (const k of ['titel', 'serie', 'strecke', 'unteralbum']) {
        if (!worth(a[k]) || filled(block[k])) continue;
        if (k !== 'titel' && isName(a[k])) continue;
        if (k === 'strecke' && isName(a.serie)) continue; // Rennalben: Strecke ist ein Ort und bleibt
        block[k] = await translateText(a[k], 'de', to); n++;
      }
      if (Object.keys(block).length) a[to] = block;
    }
    if (n) { if (!DRY) writeJSON(p, a); changed.add(`content/alben/${f}`); log.push(`Album „${a.titel || f}“: ${n} Texte`); }
  }
}

/* ---------------- Einstellungen, Kapitel, Pakete ---------------- */
async function doI18nObject(p, label, skip = []) {
  const d = readJSON(p);
  const de = d.de || {};
  let n = 0;
  for (const to of others('de')) {
    const block = d[to] || (d[to] = {});
    for (const [k, v] of Object.entries(de)) {
      if (skip.includes(k) || typeof v !== 'string' || !worth(v) || filled(block[k])) continue;
      block[k] = await translateText(v, 'de', to); n++;
    }
  }
  if (Array.isArray(de.helm_bilder)) {
    for (const b of de.helm_bilder) {
      if (!b || !filled(b.text)) continue;
      for (const to of others('de')) if (!filled(b[`text_${to}`])) { b[`text_${to}`] = await translateText(b.text, 'de', to); n++; }
    }
  }
  if (n) { if (!DRY) writeJSON(p, d); changed.add(p.slice(ROOT.length + 1)); log.push(`${label}: ${n} Texte`); }
}

async function doSite() {
  const p = join(C, 'einstellungen/site.json');
  const d = readJSON(p);
  let n = 0;
  const vids = [...(d.videos || []), d.video_breit].filter(Boolean);
  for (const v of vids) for (const k of ['titel', 'text']) {
    if (!worth(v[k])) continue;
    for (const to of others('de')) if (!filled(v[`${k}_${to}`])) { v[`${k}_${to}`] = await translateText(v[k], 'de', to); n++; }
  }
  for (const k of ['impressum', 'datenschutz']) {
    if (!filled(d[k])) continue;
    for (const to of others('de')) if (!filled(d[`${k}_${to}`])) { d[`${k}_${to}`] = await translateMarkdown(d[k], 'de', to); n++; }
  }
  if (n) { if (!DRY) writeJSON(p, d); changed.add('content/einstellungen/site.json'); log.push(`Einstellungen (Videos/Rechtliches): ${n} Texte`); }
}

async function doPakete() {
  const dir = join(C, 'pakete');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = join(dir, f);
    const d = readJSON(p);
    let n = 0;
    for (const to of others('de')) {
      if (filled(d.untertitel) && !filled(d[`untertitel_${to}`])) { d[`untertitel_${to}`] = await translateText(d.untertitel, 'de', to); n++; }
      if (filled(d.laufzeit) && !filled(d[`laufzeit_${to}`])) { d[`laufzeit_${to}`] = await translateText(d.laufzeit, 'de', to); n++; }
      if (Array.isArray(d.leistungen) && d.leistungen.length && !(Array.isArray(d[`leistungen_${to}`]) && d[`leistungen_${to}`].length)) {
        d[`leistungen_${to}`] = [];
        for (const l of d.leistungen) d[`leistungen_${to}`].push(await translateText(l, 'de', to));
        n++;
      }
    }
    if (n) { if (!DRY) writeJSON(p, d); changed.add(`content/pakete/${f}`); log.push(`Paket „${d.name}“: ${n} Texte`); }
  }
}

async function doRennen() {
  const dir = join(C, 'rennen');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = join(dir, f);
    const d = readJSON(p);
    if (!worth(d.grund) || /^unfall$/i.test(String(d.grund).trim())) continue; // „Unfall“ steht fest in den Sprachdateien
    let n = 0;
    for (const to of others('de')) if (!filled(d[`grund_${to}`])) { d[`grund_${to}`] = await translateText(d.grund, 'de', to); n++; }
    if (n) { if (!DRY) writeJSON(p, d); changed.add(`content/rennen/${f}`); log.push(`Rennen ${f}: Grund übersetzt`); }
  }
}

/* ---------------- Ablauf ---------------- */
let failed = null;
try {
  await doNews();
  await doAlben();
  await doSite();
  await doI18nObject(join(C, 'einstellungen/texte.json'), 'Seitentexte');
  await doI18nObject(join(C, 'einstellungen/fahrer.json'), 'Steckbrief', ['team_link']);
  const kdir = join(C, 'kapitel');
  if (existsSync(kdir)) for (const f of readdirSync(kdir).filter((x) => x.endsWith('.json'))) await doI18nObject(join(kdir, f), `Kapitel ${f}`, ['nummer', 'bild']);
  await doPakete();
  await doRennen();
} catch (err) {
  failed = err;
}

console.log(`Übersetzungsdienst: ${PROVIDER}${DRY ? ' (Probelauf)' : ''} · ${chars} Zeichen`);
log.forEach((l) => console.log('  ✔ ' + l));
warnings.forEach((w) => console.log('  ⚠ ' + w));
if (!log.length && !failed) console.log('  Alles ist bereits übersetzt.');
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `### Übersetzung (${PROVIDER})\n\n${log.map((l) => `- ✔ ${l}`).join('\n') || '- Alles ist bereits übersetzt.'}\n${warnings.map((w) => `- ⚠ ${w}`).join('\n')}\n`, { flag: 'a' });
if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.size ? 'true' : 'false'}\nsummary=${log.slice(0, 5).join('; ').replace(/\n/g, ' ')}\n`, { flag: 'a' });
if (failed) {
  console.error(`✖ Übersetzung abgebrochen: ${failed.message}`);
  console.error('  Bereits fertige Übersetzungen wurden gespeichert. Der Rest wird beim nächsten Speichern erneut versucht.');
  process.exit(1);
}
