// Squadra Tre – feste Regeln (Datenschutz-Umbau 02.11.2026, Anforderungen L1–L17 der Rechtsabteilung).
// Reine Funktionen ohne Netzwerk und ohne Umgebungsvariablen: werden von den Netlify Functions,
// vom Website-Build (scripts/lib/content.mjs) und von den Tests (tests/squadra.test.mjs) gemeinsam genutzt.

export const EINWILLIGUNG_VERSION = '2026-11-02';
export const TOKEN_TAGE = 7;
const TAG_MS = 24 * 3600 * 1000;

export const ALTERSSTUFEN = ['unter16', '16bis17', '18plus'];
// Zwecke, denen Eltern einzeln zustimmen (L1)
export const ZWECKE = ['mitglied', 'wall_name', 'foto', 'updates', 'jahresbericht'];
export const SPITZNAME_MAX = 20;

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const yes = (v) => !!v && v !== 'false' && v !== '0' && v !== 'off';

// Öffentlicher Anzeigename: Vorname + Initiale des letzten Wortes ("Marco Rossi" → "Marco R.")
export function kurzName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export const nameWoerter = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).length;

export const cleanHandle = (s) => String(s || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);

// Spitzname: Steuerzeichen und spitze Klammern raus, Leerraum zusammenfassen, max. 20 Zeichen
export function cleanSpitzname(s) {
  const v = String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(v).slice(0, SPITZNAME_MAX).join('').trim() || null;
}

/* ---------- Altersstufen ---------- */
// Alte Einträge (vor 004) haben keine Altersstufe – nur „minderjaehrig“ (damals: unter 16).
export const stufeVon = (r) => (r && ALTERSSTUFEN.includes(r.altersstufe) ? r.altersstufe : null);
export function istMinderjaehrig(r) {
  const s = stufeVon(r);
  if (s) return s !== '18plus';
  return !!(r && r.minderjaehrig);
}
// Mitgliedschaft braucht die Eltern: unter 16 – und alte minderjährige Einträge ohne Altersstufe (L8)
export function brauchtElternFuerMitgliedschaft(r) {
  const s = stufeVon(r);
  if (s) return s === 'unter16';
  return !!(r && r.minderjaehrig);
}

export const zweckeVon = (r) => (r && r.eltern_zwecke && typeof r.eltern_zwecke === 'object' ? r.eltern_zwecke : {});
export const elternErlaubt = (r, zweck) => !!(r && r.eltern_bestaetigt_am && zweckeVon(r)[zweck] === true);

/* ---------- Gültigkeit der Bestätigungslinks (L4) ---------- */
export function ablaufVon(r) {
  if (r && r.token_ablauf) return new Date(r.token_ablauf).getTime();
  const c = r && r.created_at ? new Date(r.created_at).getTime() : 0;
  return c + TOKEN_TAGE * TAG_MS;
}
export const tokenGueltig = (r, now = Date.now()) => ablaufVon(r) > now;
export const neuerAblauf = (now = Date.now()) => new Date(now + TOKEN_TAGE * TAG_MS).toISOString();

/* ---------- Anmeldung prüfen (L6, L10, L11, L7, L8, L16) ---------- */
// b = Formularfelder, foto = true/false (Foto mitgeschickt). Ergebnis: { error: '<ERR-Schlüssel>' } oder
// { row, elternEmail, elternNoetig, stufe } – row ohne Foto-Pfad und ohne Tokens (die vergibt die Datenbank).
export function pruefeAnmeldung(b, { foto = false, now = Date.now() } = {}) {
  const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (!name || !MAIL.test(email)) return { error: 'name_mail' };
  if (!yes(b.datenschutz)) return { error: 'privacy' };

  const stufe = String(b.alter || '');
  if (!ALTERSSTUFEN.includes(stufe)) return { error: 'age' };
  const minderjaehrig = stufe !== '18plus';

  const elternEmailRoh = String(b.eltern_email || '').trim().toLowerCase().slice(0, 200);
  // unter 16: Eltern immer · 16/17: Eltern nur für ein Foto · 18+: keine Eltern
  const elternNoetig = stufe === 'unter16' || (stufe === '16bis17' && foto);
  if (elternNoetig && (!MAIL.test(elternEmailRoh) || elternEmailRoh === email)) return { error: stufe === 'unter16' ? 'parent' : 'parent_photo' };
  const elternEmail = elternNoetig ? elternEmailRoh : null;

  if (foto && !yes(b.foto_einwilligung)) return { error: 'photo_ok' };

  // Unterstützer (mit Beitrag) erst ab 18 – Minderjährige sind immer „Freund“ (L10)
  const mitgliedschaft = !minderjaehrig && b.mitgliedschaft === 'unterstuetzer' ? 'unterstuetzer' : 'freund';
  const art = mitgliedschaft === 'unterstuetzer' && ['einmalig', 'jaehrlich', 'sachleistung'].includes(b.art) ? b.art : null;
  const betrag = mitgliedschaft === 'unterstuetzer' && Number(b.betrag) > 0 ? Math.min(Number(b.betrag), 1000000) : null;

  const row = {
    name, email, sprache: b.sprache || 'de', mitgliedschaft, art, betrag,
    instagram: minderjaehrig ? null : (cleanHandle(b.instagram) || null), // L11: kein Instagram von Minderjährigen
    angezeigter_name: kurzName(name),
    spitzname: cleanSpitzname(b.spitzname),
    name_freigegeben: false,
    altersstufe: stufe,
    minderjaehrig,
    einwilligung_eltern: elternEmail,
    jahresbericht_optin: mitgliedschaft === 'unterstuetzer' && yes(b.jahresbericht),
    updates_optin: yes(b.updates),
    wand_optin: yes(b.wand), // L7: nur das Häkchen „Name“ – die Foto-Einwilligung schaltet den Namen nicht mehr ein
    einwilligung_version: EINWILLIGUNG_VERSION,
    einwilligung_am: new Date(now).toISOString(),
    token_ablauf: neuerAblauf(now),
    quelle: 'website'
  };
  return { row, elternEmail, elternNoetig, stufe };
}

/* ---------- Namen auf der Wall (L8) ---------- */
// Einwortnamen und Spitznamen prüft das Team, bevor sie erscheinen.
export const brauchtNamensFreigabe = (r) => nameWoerter(r && r.name) < 2 || !!(r && r.spitzname);
export function nameErlaubt(r) {
  if (!r) return false;
  if (r.name_freigegeben) return true;
  return nameWoerter(r.name) >= 2;
}
export function anzeigeName(r) {
  if (!r) return '';
  if (r.spitzname && r.name_freigegeben) return r.spitzname;
  return r.angezeigter_name || kurzName(r.name);
}

/* ---------- Was darf öffentlich auf die Wall? (L1, L7, L8) ---------- */
// Ergebnis je Eintrag: { name: '<Anzeigename>' | '', foto: true/false } – oder null (gar nicht zeigen).
export function wallEintrag(r) {
  if (!r || !r.optin_bestaetigt || r.ausgeblendet) return null;
  const elternPflicht = brauchtElternFuerMitgliedschaft(r);
  if (elternPflicht && !elternErlaubt(r, 'mitglied')) return null;
  let name = '';
  if (r.wand_optin && nameErlaubt(r) && (!elternPflicht || elternErlaubt(r, 'wall_name'))) name = anzeigeName(r);
  let foto = !!(r.foto_pfad && r.foto_freigegeben);
  if (foto && istMinderjaehrig(r) && !elternErlaubt(r, 'foto')) foto = false; // Fotos unter 18 nur mit Eltern
  if (!name && !foto) return null;
  return { name, foto };
}

// rows (Datenbank) → öffentliche Liste { id, name, seit, foto_pfad, unterstuetzer } (Reihenfolge wie rows)
export function oeffentlicheWall(rows) {
  const out = [];
  for (const r of rows || []) {
    const e = wallEintrag(r);
    if (!e) continue;
    out.push({ id: r.id, name: e.name, seit: r.created_at || '', foto_pfad: e.foto ? r.foto_pfad : null, unterstuetzer: r.mitgliedschaft === 'unterstuetzer' });
  }
  return out;
}

// Reihenfolge der Wall (Wunsch 01.11./02.11.2026): angepinnte Mitglieder (Knopf „Pin“ im Admin-Bereich) immer zuerst,
// in Pin-Reihenfolge; danach alle anderen nach Registrierungsdatum (älteste zuerst) – neue Mitglieder kommen hinten dazu.
export function wallOrder(list, pins) {
  const P = Array.isArray(pins) ? pins : [];
  const rank = (m) => { const i = P.indexOf(m.id); return i < 0 ? P.length : i; };
  return list.map((m, i) => ({ m, i, r: rank(m) }))
    .sort((a, b) => a.r - b.r || String(a.m.seit).localeCompare(String(b.m.seit)) || a.i - b.i)
    .map(({ m }) => { const { id, seit, ...rest } = m; return rest; });
}

/* ---------- Eltern-Bestätigung (L1) ---------- */
// Welche Zwecke den Eltern angeboten werden – nur, was das Kind gewählt hat.
export function elternAngebot(r) {
  if (!r) return [];
  if (brauchtElternFuerMitgliedschaft(r)) {
    return ZWECKE.filter((z) => z === 'mitglied'
      || (z === 'wall_name' && r.wand_optin)
      || (z === 'foto' && r.foto_pfad)
      || (z === 'updates' && r.updates_optin)
      || (z === 'jahresbericht' && r.jahresbericht_optin));
  }
  if (istMinderjaehrig(r) && r.foto_pfad) return ['foto']; // 16/17: nur das Foto braucht die Eltern
  return [];
}

// Formular der Eltern → { error } oder { zwecke } (nur angebotene Zwecke; nicht angehakt = false)
export function pruefeElternAntwort(r, b) {
  if (!yes(b && b.sorgeberechtigt)) return { error: 'custody' };
  const angebot = elternAngebot(r);
  if (!angebot.length) return { error: 'link' };
  const gewaehlt = b && b.zwecke && typeof b.zwecke === 'object' ? b.zwecke : b || {};
  const zwecke = Object.fromEntries(angebot.map((z) => [z, yes(gewaehlt[z])]));
  return { zwecke };
}

/* ---------- Empfänger von Rundmails (L12) ---------- */
// art = 'updates' | 'jahresbericht'
export function mailEmpfaenger(rows, art) {
  const feld = art === 'jahresbericht' ? 'jahresbericht_optin' : 'updates_optin';
  return (rows || []).filter((r) => {
    if (!r || !r.email || !r.optin_bestaetigt || !r[feld]) return false;
    if (brauchtElternFuerMitgliedschaft(r)) return elternErlaubt(r, 'mitglied') && elternErlaubt(r, art);
    return true;
  });
}

/* ---------- Instagram-Post im Wochenbericht (L3) ---------- */
// Keine Minderjährigen im Post-Text – nur Volljährige, deren Name auch auf der Wall stehen darf.
export function imPostNennbar(r) {
  if (!r || istMinderjaehrig(r)) return false;
  const e = wallEintrag(r);
  return !!(e && e.name);
}

/* ---------- Aufräumen nach 7 Tagen (L4) ---------- */
// Ergebnis: { zeilen: [{ id, foto_pfad }], fotos: [{ id, foto_pfad }] }
export function aufraeumPlan(rows, now = Date.now()) {
  const zeilen = [], fotos = [];
  for (const r of rows || []) {
    if (!r || !r.id) continue;
    const abgelaufen = !tokenGueltig(r, now);
    if (!abgelaufen) continue;
    const s = stufeVon(r);
    if (s === 'unter16') {
      // unter 16: ohne Zustimmung der Eltern zur Mitgliedschaft → ganz löschen
      if (!elternErlaubt(r, 'mitglied')) { zeilen.push({ id: r.id, foto_pfad: r.foto_pfad || null }); continue; }
    } else if (!r.optin_bestaetigt) {
      // alle anderen (auch alte Einträge ohne Altersstufe): nicht selbst bestätigt → ganz löschen
      zeilen.push({ id: r.id, foto_pfad: r.foto_pfad || null });
      continue;
    }
    // 16/17 mit Foto, aber ohne Zustimmung der Eltern zum Foto → nur das Foto löschen
    if (s === '16bis17' && r.foto_pfad && !elternErlaubt(r, 'foto')) fotos.push({ id: r.id, foto_pfad: r.foto_pfad });
  }
  return { zeilen, fotos };
}

/* ---------- Bildtyp am Inhalt erkennen ---------- */
export function bildTyp(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
