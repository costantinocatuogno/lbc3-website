// Tests für den Squadra-Tre-Datenschutz-Umbau (L1–L17). Ausführen: npm test  (node:test, keine Abhängigkeiten, kein Netzwerk)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { stripJpeg, stripPng, stripWebp, stripMetadata, BildFehler } from '../netlify/functions/_lib/common.mjs';
import {
  pruefeAnmeldung, kurzName, anzeigeName, nameErlaubt, brauchtNamensFreigabe, wallEintrag, oeffentlicheWall,
  elternAngebot, pruefeElternAntwort, mailEmpfaenger, aufraeumPlan, imPostNennbar, tokenGueltig, bildTyp,
  istMinderjaehrig, brauchtElternFuerMitgliedschaft, cleanSpitzname, wallOrder, EINWILLIGUNG_VERSION,
  doppelteAnmeldung, elternUebersicht, altBestaetigt
} from '../netlify/functions/_lib/squadra-rules.mjs';

const TAG = 24 * 3600 * 1000;
const NOW = Date.parse('2026-11-02T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

/* ---------- Bild-Hilfen: kleine synthetische Dateien ---------- */
const seg = (marker, payload) => { const b = Buffer.alloc(4); b[0] = 0xff; b[1] = marker; b.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([b, payload]); };
function jpeg() {
  const app0 = seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'));
  const app1 = seg(0xe1, Buffer.from('Exif\0\0GPS 47.80N 7.63E Canon EOS', 'latin1'));
  const app13 = seg(0xed, Buffer.from('Photoshop 3.0\0IPTC Muellheim', 'latin1'));
  const com = seg(0xfe, Buffer.from('Kommentar mit Namen', 'latin1'));
  const dqt = seg(0xdb, Buffer.alloc(65, 1));
  const sos = seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0]));
  const scan = Buffer.from([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xd9]); // Bilddaten mit Stuffing + RST + EOI
  return { all: Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, app13, com, dqt, sos, scan]), keep: Buffer.concat([Buffer.from([0xff, 0xd8]), app0, dqt, sos, scan]) };
}
const crc = (buf) => (zlib.crc32 ? zlib.crc32(buf) : 0) >>> 0;
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png() {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]));
  const text = chunk('tEXt', Buffer.from('Author\0Marco Rossi', 'latin1'));
  const ztxt = chunk('zTXt', Buffer.from('Comment\0\0x', 'latin1'));
  const itxt = chunk('iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x/>', 'latin1'));
  const exif = chunk('eXIf', Buffer.from('MM\0*GPS', 'latin1'));
  const time = chunk('tIME', Buffer.from([7, 234, 11, 2, 12, 0, 0]));
  const idat = chunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0, 0, 0, 2, 0, 1]));
  const iend = chunk('IEND', Buffer.alloc(0));
  return { all: Buffer.concat([sig, ihdr, text, ztxt, time, exif, idat, itxt, iend]), keep: Buffer.concat([sig, ihdr, idat, iend]) };
}
const wchunk = (fourcc, data) => { const h = Buffer.alloc(8); h.write(fourcc, 0, 'latin1'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
function webp() {
  const vp8x = Buffer.alloc(10); vp8x[0] = 0x10 | 0x08 | 0x04; // Alpha + EXIF + XMP
  const parts = [wchunk('VP8X', vp8x), wchunk('VP8L', Buffer.from([0x2f, 1, 2, 3, 4])), wchunk('EXIF', Buffer.from('MM\0*GPS 47.8', 'latin1')), wchunk('XMP ', Buffer.from('<x:xmpmeta/>', 'latin1'))];
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(12); head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(4 + body.length, 4); head.write('WEBP', 8, 'ascii');
  return Buffer.concat([head, body]);
}

describe('L5 Metadaten entfernen', () => {
  test('JPEG: APP1–APP15 und COM raus, APP0, Tabellen und Bilddaten bleiben', () => {
    const { all, keep } = jpeg();
    const out = stripJpeg(all);
    assert.deepEqual(out, keep);
    assert.ok(!out.toString('latin1').includes('GPS'));
    assert.ok(!out.toString('latin1').includes('Kommentar'));
    assert.equal(bildTyp(out), 'image/jpeg');
  });
  test('JPEG: kaputte Datei wird abgelehnt', () => {
    assert.throws(() => stripJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 1, 2])), BildFehler);
    assert.throws(() => stripJpeg(Buffer.from('kein bild')), BildFehler);
  });
  test('PNG: tEXt/zTXt/iTXt/eXIf/tIME raus, Rest unverändert', () => {
    const { all, keep } = png();
    const out = stripPng(all);
    assert.deepEqual(out, keep);
    assert.ok(!out.toString('latin1').includes('Marco'));
  });
  test('PNG: ohne IEND abgelehnt', () => {
    const { keep } = png();
    assert.throws(() => stripPng(keep.subarray(0, keep.length - 12)), BildFehler);
  });
  test('WebP: EXIF/XMP raus, RIFF-Größe und VP8X-Flags korrigiert', () => {
    const out = stripWebp(webp());
    const s = out.toString('latin1');
    assert.ok(!s.includes('EXIF') && !s.includes('XMP ') && !s.includes('GPS'));
    assert.equal(out.readUInt32LE(4), out.length - 8);
    assert.equal(out.toString('latin1', 12, 16), 'VP8X');
    assert.equal(out[20] & 0x08, 0, 'EXIF-Flag aus');
    assert.equal(out[20] & 0x04, 0, 'XMP-Flag aus');
    assert.equal(out[20] & 0x10, 0x10, 'Alpha-Flag bleibt');
    assert.ok(s.includes('VP8L'));
    assert.equal(out.length % 2, 0);
  });
  test('stripMetadata wählt nach Typ und lehnt Unbekanntes ab', () => {
    assert.deepEqual(stripMetadata(jpeg().all, 'image/jpeg'), jpeg().keep);
    assert.throws(() => stripMetadata(Buffer.from('GIF89a......'), 'image/gif'), BildFehler);
    assert.equal(bildTyp(Buffer.from('GIF89a......')), null);
    assert.equal(bildTyp(webp()), 'image/webp');
  });
});

/* ---------- Anmeldung ---------- */
const basis = { name: 'Marco Rossi', email: 'Marco@Example.com', datenschutz: '1', wand: '1', mitgliedschaft: 'unterstuetzer', art: 'einmalig', betrag: '20', instagram: '@marco.r', jahresbericht: '1', updates: '1' };

describe('L6/L10/L11 Altersstufen und abgeleitete Felder', () => {
  test('ungültige oder alte Altersangabe → Fehler "age"', () => {
    assert.equal(pruefeAnmeldung({ ...basis }).error, 'age');
    assert.equal(pruefeAnmeldung({ ...basis, alter: '16plus' }).error, 'age');
    assert.equal(pruefeAnmeldung({ ...basis, alter: 'x' }).error, 'age');
  });
  test('18plus: Unterstützer und Instagram erlaubt, keine Eltern', () => {
    const r = pruefeAnmeldung({ ...basis, alter: '18plus', eltern_email: 'p@example.com' }, { now: NOW });
    assert.equal(r.error, undefined);
    assert.equal(r.row.altersstufe, '18plus');
    assert.equal(r.row.minderjaehrig, false);
    assert.equal(r.row.mitgliedschaft, 'unterstuetzer');
    assert.equal(r.row.betrag, 20);
    assert.equal(r.row.instagram, 'marco.r');
    assert.equal(r.row.einwilligung_eltern, null);
    assert.equal(r.row.email, 'marco@example.com');
    assert.equal(r.row.einwilligung_version, EINWILLIGUNG_VERSION);
    assert.equal(r.row.token_ablauf, iso(NOW + 7 * TAG));
    assert.equal(r.elternNoetig, false);
  });
  test('unter16: Eltern-E-Mail Pflicht und ≠ eigene; immer Freund, kein Instagram', () => {
    assert.equal(pruefeAnmeldung({ ...basis, alter: 'unter16' }).error, 'parent');
    assert.equal(pruefeAnmeldung({ ...basis, alter: 'unter16', eltern_email: 'MARCO@example.com' }).error, 'parent');
    const r = pruefeAnmeldung({ ...basis, alter: 'unter16', eltern_email: 'Mama@Example.com' });
    assert.equal(r.row.minderjaehrig, true);
    assert.equal(r.row.mitgliedschaft, 'freund');
    assert.equal(r.row.art, null);
    assert.equal(r.row.betrag, null);
    assert.equal(r.row.jahresbericht_optin, false);
    assert.equal(r.row.instagram, null);
    assert.equal(r.row.einwilligung_eltern, 'mama@example.com');
    assert.equal(r.elternNoetig, true);
  });
  test('16bis17: Eltern nur mit Foto nötig', () => {
    const ohne = pruefeAnmeldung({ ...basis, alter: '16bis17' }, { foto: false });
    assert.equal(ohne.error, undefined);
    assert.equal(ohne.elternNoetig, false);
    assert.equal(ohne.row.einwilligung_eltern, null);
    assert.equal(ohne.row.mitgliedschaft, 'freund');
    assert.equal(ohne.row.instagram, null);
    assert.equal(pruefeAnmeldung({ ...basis, alter: '16bis17', foto_einwilligung: '1' }, { foto: true }).error, 'parent_photo');
    const mit = pruefeAnmeldung({ ...basis, alter: '16bis17', foto_einwilligung: '1', eltern_email: 'papa@example.com' }, { foto: true });
    assert.equal(mit.elternNoetig, true);
    assert.equal(mit.row.einwilligung_eltern, 'papa@example.com');
  });
  test('Foto ohne Einwilligung → Fehler; Foto-Einwilligung schaltet den Namen nicht ein (L7)', () => {
    assert.equal(pruefeAnmeldung({ ...basis, alter: '18plus' }, { foto: true }).error, 'photo_ok');
    const r = pruefeAnmeldung({ ...basis, alter: '18plus', wand: '', foto_einwilligung: '1' }, { foto: true });
    assert.equal(r.row.wand_optin, false);
  });
  test('Spitzname: bereinigt, max. 20 Zeichen, braucht Freigabe', () => {
    assert.equal(cleanSpitzname('  <b>Turbo</b>  Gigi  '), 'bTurbo/b Gigi');
    assert.equal(cleanSpitzname('x'.repeat(30)).length, 20);
    assert.equal(cleanSpitzname('   '), null);
    const r = pruefeAnmeldung({ ...basis, alter: '18plus', spitzname: 'Turbo' });
    assert.equal(r.row.spitzname, 'Turbo');
    assert.equal(r.row.name_freigegeben, false);
  });
  test('Pflichtfelder', () => {
    assert.equal(pruefeAnmeldung({ ...basis, alter: '18plus', email: 'kaputt' }).error, 'name_mail');
    assert.equal(pruefeAnmeldung({ ...basis, alter: '18plus', datenschutz: '' }).error, 'privacy');
  });
});

/* ---------- Namen ---------- */
describe('L8 Anzeigename und Freigabe', () => {
  test('kurzName', () => {
    assert.equal(kurzName('Marco Rossi'), 'Marco R.');
    assert.equal(kurzName('  anna  maria   bianchi '), 'anna B.');
    assert.equal(kurzName('Luca'), 'Luca');
    assert.equal(kurzName(''), '');
  });
  test('Zweiwortname ohne Freigabe sichtbar, Einwortname und Spitzname brauchen Freigabe', () => {
    assert.equal(nameErlaubt({ name: 'Marco Rossi' }), true);
    assert.equal(nameErlaubt({ name: 'Luca' }), false);
    assert.equal(nameErlaubt({ name: 'Luca', name_freigegeben: true }), true);
    assert.equal(brauchtNamensFreigabe({ name: 'Marco Rossi' }), false);
    assert.equal(brauchtNamensFreigabe({ name: 'Marco Rossi', spitzname: 'Turbo' }), true);
    assert.equal(brauchtNamensFreigabe({ name: 'Luca' }), true);
  });
  test('Spitzname erscheint erst nach Freigabe statt Kurzname', () => {
    assert.equal(anzeigeName({ name: 'Marco Rossi', spitzname: 'Turbo' }), 'Marco R.');
    assert.equal(anzeigeName({ name: 'Marco Rossi', spitzname: 'Turbo', name_freigegeben: true }), 'Turbo');
    assert.equal(anzeigeName({ name: 'Marco Rossi', angezeigter_name: 'Marco R. (Team)' }), 'Marco R. (Team)');
  });
});

/* ---------- Öffentliche Wall ---------- */
const erw = (x = {}) => ({ id: 'a', name: 'Marco Rossi', angezeigter_name: 'Marco R.', optin_bestaetigt: true, wand_optin: true, ausgeblendet: false, altersstufe: '18plus', minderjaehrig: false, created_at: '2026-10-01T00:00:00Z', ...x });
const elternJa = (zwecke) => ({ eltern_bestaetigt_am: '2026-10-02T00:00:00Z', eltern_zwecke: zwecke });

describe('Build-Filter der öffentlichen Wall', () => {
  test('Erwachsene wie bisher; unbestätigt/ausgeblendet/ohne Wall-Häkchen nicht', () => {
    assert.deepEqual(wallEintrag(erw()), { name: 'Marco R.', foto: false });
    assert.equal(wallEintrag(erw({ optin_bestaetigt: false })), null);
    assert.equal(wallEintrag(erw({ ausgeblendet: true })), null);
    assert.equal(wallEintrag(erw({ wand_optin: false })), null);
  });
  test('Foto nur freigegeben; Foto ohne Namens-Häkchen → Kachel ohne Namen (L7)', () => {
    assert.deepEqual(wallEintrag(erw({ foto_pfad: 'a.jpg' })), { name: 'Marco R.', foto: false });
    assert.deepEqual(wallEintrag(erw({ foto_pfad: 'a.jpg', foto_freigegeben: true })), { name: 'Marco R.', foto: true });
    assert.deepEqual(wallEintrag(erw({ wand_optin: false, foto_pfad: 'a.jpg', foto_freigegeben: true })), { name: '', foto: true });
  });
  test('Einwortname ohne Freigabe nicht sichtbar (auch alte Einträge)', () => {
    assert.equal(wallEintrag(erw({ name: 'Luca', angezeigter_name: 'Luca', altersstufe: null })), null);
    assert.deepEqual(wallEintrag(erw({ name: 'Luca', angezeigter_name: 'Luca', name_freigegeben: true })), { name: 'Luca', foto: false });
  });
  test('alte minderjährige Einträge (ohne Altersstufe) verschwinden, bis Eltern bestätigen', () => {
    const alt = erw({ altersstufe: null, minderjaehrig: true, foto_pfad: 'b.jpg', foto_freigegeben: true });
    assert.equal(wallEintrag(alt), null);
    assert.equal(brauchtElternFuerMitgliedschaft(alt), true);
    assert.deepEqual(wallEintrag({ ...alt, ...elternJa({ mitglied: true, wall_name: true, foto: false }) }), { name: 'Marco R.', foto: false });
    assert.deepEqual(wallEintrag({ ...alt, ...elternJa({ mitglied: true, wall_name: true, foto: true }) }), { name: 'Marco R.', foto: true });
  });
  test('unter16: nur mit Eltern; Name nur mit wall_name, Foto nur mit foto', () => {
    const k = erw({ altersstufe: 'unter16', minderjaehrig: true, foto_pfad: 'c.jpg', foto_freigegeben: true });
    assert.equal(wallEintrag(k), null);
    assert.equal(wallEintrag({ ...k, ...elternJa({ mitglied: false, wall_name: true, foto: true }) }), null);
    assert.deepEqual(wallEintrag({ ...k, ...elternJa({ mitglied: true, wall_name: false, foto: true }) }), { name: '', foto: true });
    assert.equal(wallEintrag({ ...k, ...elternJa({ mitglied: true, wall_name: false, foto: false }) }), null);
    assert.equal(wallEintrag({ ...k, eltern_zwecke: { mitglied: true, wall_name: true } }), null, 'Zwecke ohne Bestätigungsdatum zählen nicht');
  });
  test('16bis17: Name ohne Eltern, Foto nur mit Eltern-Zustimmung foto', () => {
    const j = erw({ altersstufe: '16bis17', minderjaehrig: true, foto_pfad: 'd.jpg', foto_freigegeben: true });
    assert.deepEqual(wallEintrag(j), { name: 'Marco R.', foto: false });
    assert.deepEqual(wallEintrag({ ...j, ...elternJa({ foto: true }) }), { name: 'Marco R.', foto: true });
  });
  test('oeffentlicheWall: Liste mit foto_pfad nur bei erlaubtem Foto', () => {
    const rows = [
      erw({ id: '1', foto_pfad: '1.jpg', foto_freigegeben: true, mitgliedschaft: 'unterstuetzer' }),
      erw({ id: '2', altersstufe: null, minderjaehrig: true }),
      erw({ id: '3', altersstufe: '16bis17', minderjaehrig: true, foto_pfad: '3.jpg', foto_freigegeben: true }),
      erw({ id: '4', name: 'Solo', angezeigter_name: 'Solo' })
    ];
    assert.deepEqual(oeffentlicheWall(rows), [
      { id: '1', name: 'Marco R.', seit: '2026-10-01T00:00:00Z', foto_pfad: '1.jpg', unterstuetzer: true },
      { id: '3', name: 'Marco R.', seit: '2026-10-01T00:00:00Z', foto_pfad: null, unterstuetzer: false }
    ]);
  });
  test('wallOrder: Pins zuerst, dann nach Datum; id/seit werden entfernt', () => {
    const l = [{ id: 'a', seit: '2026-01-02', name: 'A' }, { id: 'b', seit: '2026-01-01', name: 'B' }, { id: 'c', seit: '2026-01-03', name: 'C' }];
    assert.deepEqual(wallOrder(l, ['c']).map((m) => m.name), ['C', 'B', 'A']);
    assert.deepEqual(Object.keys(wallOrder(l, [])[0]), ['name']);
  });
});

/* ---------- Eltern ---------- */
describe('L1 Eltern-Zwecke', () => {
  test('Angebot unter16 = Mitglied + was das Kind gewählt hat', () => {
    assert.deepEqual(elternAngebot({ altersstufe: 'unter16', wand_optin: true, foto_pfad: 'x.jpg', updates_optin: false, jahresbericht_optin: false }), ['mitglied', 'wall_name', 'foto']);
    assert.deepEqual(elternAngebot({ altersstufe: 'unter16', updates_optin: true }), ['mitglied', 'updates']);
    assert.deepEqual(elternAngebot({ altersstufe: null, minderjaehrig: true, wand_optin: true }), ['mitglied', 'wall_name']);
  });
  test('Angebot 16bis17 nur Foto; 18plus nichts', () => {
    assert.deepEqual(elternAngebot({ altersstufe: '16bis17', foto_pfad: 'x.jpg', wand_optin: true }), ['foto']);
    assert.deepEqual(elternAngebot({ altersstufe: '16bis17', wand_optin: true }), []);
    assert.deepEqual(elternAngebot({ altersstufe: '18plus', foto_pfad: 'x.jpg' }), []);
  });
  test('Antwort: Sorgerecht-Häkchen Pflicht; nur angebotene Zwecke, abgewählte = false', () => {
    const r = { altersstufe: 'unter16', wand_optin: true, foto_pfad: 'x.jpg' };
    assert.equal(pruefeElternAntwort(r, { zwecke: { mitglied: true } }).error, 'custody');
    const a = pruefeElternAntwort(r, { sorgeberechtigt: true, zwecke: { mitglied: true, wall_name: true, foto: false, updates: true } });
    assert.deepEqual(a.zwecke, { mitglied: true, wall_name: true, foto: false });
    assert.equal(pruefeElternAntwort({ altersstufe: '18plus' }, { sorgeberechtigt: true }).error, 'link');
  });
  test('Links laufen nach 7 Tagen ab', () => {
    assert.equal(tokenGueltig({ token_ablauf: iso(NOW + 1000) }, NOW), true);
    assert.equal(tokenGueltig({ token_ablauf: iso(NOW - 1000) }, NOW), false);
    assert.equal(tokenGueltig({ created_at: iso(NOW - 6 * TAG) }, NOW), true);
    assert.equal(tokenGueltig({ created_at: iso(NOW - 8 * TAG) }, NOW), false);
  });
  test('istMinderjaehrig', () => {
    assert.equal(istMinderjaehrig({ altersstufe: '16bis17' }), true);
    assert.equal(istMinderjaehrig({ altersstufe: '18plus', minderjaehrig: true }), false);
    assert.equal(istMinderjaehrig({ minderjaehrig: true }), true);
  });
});

/* ---------- Rundmails ---------- */
describe('L12 Empfänger von Rundmails', () => {
  const rows = [
    erw({ id: '1', email: 'a@x.de', updates_optin: true, jahresbericht_optin: true }),
    erw({ id: '2', email: 'b@x.de', updates_optin: true, altersstufe: 'unter16', minderjaehrig: true }),
    erw({ id: '3', email: 'c@x.de', updates_optin: true, jahresbericht_optin: true, altersstufe: 'unter16', minderjaehrig: true, ...elternJa({ mitglied: true, updates: true, jahresbericht: false }) }),
    erw({ id: '4', email: 'd@x.de', updates_optin: true, altersstufe: '16bis17', minderjaehrig: true }),
    erw({ id: '5', email: null, updates_optin: true }),
    erw({ id: '6', email: 'f@x.de', updates_optin: true, optin_bestaetigt: false }),
    erw({ id: '7', email: 'g@x.de', updates_optin: true, altersstufe: null, minderjaehrig: true })
  ];
  test('Updates: unter 16 (auch alt) nur mit Eltern-Zweck updates', () => {
    assert.deepEqual(mailEmpfaenger(rows, 'updates').map((r) => r.id), ['1', '3', '4']);
  });
  test('Jahresbericht: unter 16 nur mit Eltern-Zweck jahresbericht', () => {
    assert.deepEqual(mailEmpfaenger(rows, 'jahresbericht').map((r) => r.id), ['1']);
  });
});

describe('L3 Instagram-Post im Wochenbericht', () => {
  test('keine Minderjährigen, nur öffentlich nennbare Volljährige', () => {
    assert.equal(imPostNennbar(erw()), true);
    assert.equal(imPostNennbar(erw({ altersstufe: '16bis17', minderjaehrig: true })), false);
    assert.equal(imPostNennbar(erw({ altersstufe: 'unter16', minderjaehrig: true, ...elternJa({ mitglied: true, wall_name: true }) })), false);
    assert.equal(imPostNennbar(erw({ altersstufe: null, minderjaehrig: true })), false);
    assert.equal(imPostNennbar(erw({ wand_optin: false })), false);
    assert.equal(imPostNennbar(erw({ name: 'Solo' })), false);
  });
});

/* ---------- Aufräumen ---------- */
describe('L4 Aufräumen nach 7 Tagen', () => {
  const alt = iso(NOW - 8 * TAG);
  const rows = [
    { id: 'e-offen', altersstufe: '18plus', optin_bestaetigt: false, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'e.jpg' },
    { id: 'e-ok', altersstufe: '18plus', optin_bestaetigt: true, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'e2.jpg' },
    { id: 'e-frisch', altersstufe: '18plus', optin_bestaetigt: false, created_at: alt, token_ablauf: iso(NOW + TAG) },
    { id: 'k-offen', altersstufe: 'unter16', optin_bestaetigt: false, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'k.jpg' },
    { id: 'k-admin', altersstufe: 'unter16', optin_bestaetigt: true, quelle: 'admin', created_at: alt, token_ablauf: iso(NOW - TAG) },
    { id: 'k-ok', altersstufe: 'unter16', optin_bestaetigt: true, created_at: alt, token_ablauf: iso(NOW - TAG), ...elternJa({ mitglied: true, foto: false }), foto_pfad: 'k2.jpg' },
    { id: 'j-foto', altersstufe: '16bis17', optin_bestaetigt: true, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'j.jpg' },
    { id: 'j-foto-ok', altersstufe: '16bis17', optin_bestaetigt: true, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'j2.jpg', ...elternJa({ foto: true }) },
    { id: 'j-offen', altersstufe: '16bis17', optin_bestaetigt: false, created_at: alt, token_ablauf: iso(NOW - TAG), foto_pfad: 'j3.jpg' },
    { id: 'legacy-kind', altersstufe: null, minderjaehrig: true, optin_bestaetigt: true, created_at: alt, foto_pfad: 'l.jpg' },
    { id: 'legacy-offen', altersstufe: null, optin_bestaetigt: false, created_at: alt }
  ];
  test('welche Zeilen ganz gelöscht werden', () => {
    const p = aufraeumPlan(rows, NOW);
    assert.deepEqual(p.zeilen, [
      { id: 'e-offen', foto_pfad: 'e.jpg' }, { id: 'k-offen', foto_pfad: 'k.jpg' }, { id: 'k-admin', foto_pfad: null },
      { id: 'j-offen', foto_pfad: 'j3.jpg' }, { id: 'legacy-offen', foto_pfad: null }
    ]);
  });
  test('welche Fotos allein gelöscht werden (16/17 ohne Eltern-Zustimmung)', () => {
    assert.deepEqual(aufraeumPlan(rows, NOW).fotos, [{ id: 'j-foto', foto_pfad: 'j.jpg' }]);
  });
  test('vor Ablauf passiert nichts', () => {
    const p = aufraeumPlan(rows, NOW - 3 * TAG);
    assert.equal(p.zeilen.length, 0);
    assert.equal(p.fotos.length, 0);
  });
});

/* ---------- Regressionstests aus dem Review (R1–R6) ---------- */
describe('R3 JPEG: progressive Scans, ICC/Adobe, Daten nach EOI', () => {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'));
  const icc = seg(0xe2, Buffer.from('ICC_PROFILE\0\x01\x01sRGB', 'latin1'));
  const fpxr = seg(0xe2, Buffer.from('FPXR\0GPS-Notiz', 'latin1'));
  const adobe = seg(0xee, Buffer.from('Adobe\0\x64\0\0\0\0\x01', 'latin1'));
  const app14x = seg(0xee, Buffer.from('Ducky GPS', 'latin1'));
  const exif = seg(0xe1, Buffer.from('Exif\0\0GPS 47.8N', 'latin1'));
  const com = seg(0xfe, Buffer.from('GPS Kommentar', 'latin1'));
  const sos = seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0]));
  const dht = seg(0xc4, Buffer.alloc(20, 2));
  const scan1 = Buffer.from([0x11, 0xff, 0x00, 0x22, 0xff, 0xd1, 0x33]);
  const scan2 = Buffer.from([0x44, 0xff, 0x00, 0x55]);
  const eoi = Buffer.from([0xff, 0xd9]);
  test('EXIF/COM zwischen zwei Scans werden entfernt, beide Scans bleiben', () => {
    const inp = Buffer.concat([soi, app0, sos, scan1, exif, com, dht, sos, scan2, eoi]);
    const out = stripJpeg(inp);
    assert.deepEqual(out, Buffer.concat([soi, app0, sos, scan1, dht, sos, scan2, eoi]));
    assert.ok(!out.toString('latin1').includes('GPS'));
  });
  test('alles nach dem ersten EOI wird abgeschnitten', () => {
    const inp = Buffer.concat([soi, app0, sos, scan1, eoi, Buffer.from('GPS 47.8N angehängt', 'latin1'), eoi]);
    const out = stripJpeg(inp);
    assert.deepEqual(out, Buffer.concat([soi, app0, sos, scan1, eoi]));
  });
  test('APP2 ICC_PROFILE und APP14 Adobe bleiben, andere APP2/APP14 fallen weg', () => {
    const out = stripJpeg(Buffer.concat([soi, app0, icc, fpxr, adobe, app14x, sos, scan1, eoi]));
    assert.deepEqual(out, Buffer.concat([soi, app0, icc, adobe, sos, scan1, eoi]));
  });
  test('Füllbytes vor Markern im Scan', () => {
    const out = stripJpeg(Buffer.concat([soi, sos, Buffer.from([0x10, 0xff]), exif, eoi]));
    assert.ok(!out.toString('latin1').includes('Exif'));
  });
  test('JPEG ohne EOI wird abgelehnt', () => {
    assert.throws(() => stripJpeg(Buffer.concat([soi, app0, sos, scan1])), BildFehler);
  });
});

describe('R1 alte bestätigte Minderjährige werden nie gelöscht', () => {
  const legacy = { id: 'legacy', altersstufe: null, minderjaehrig: true, optin_bestaetigt: true, created_at: iso(NOW - 400 * TAG), foto_pfad: 'l.jpg' };
  test('auch nach „Eltern-Bestätigung anfordern“ (neuer, dann abgelaufener Link)', () => {
    const angefordert = { ...legacy, token_ablauf: iso(NOW - TAG), einwilligung_eltern: 'm@x.de' };
    assert.equal(altBestaetigt(angefordert), true);
    assert.deepEqual(aufraeumPlan([angefordert], NOW), { zeilen: [], fotos: [] });
  });
  test('bleibt nur verborgen', () => {
    assert.equal(wallEintrag({ ...legacy, wand_optin: true, name: 'Marco Rossi', foto_freigegeben: true }), null);
  });
  test('unbestätigte alte Einträge und neue unter-16-Einträge ohne Eltern werden weiter gelöscht', () => {
    const p = aufraeumPlan([
      { id: 'alt-offen', altersstufe: null, minderjaehrig: true, optin_bestaetigt: false, created_at: iso(NOW - 30 * TAG) },
      { id: 'neu-u16', altersstufe: 'unter16', optin_bestaetigt: true, quelle: 'admin', created_at: iso(NOW - 30 * TAG), token_ablauf: iso(NOW - TAG) }
    ], NOW);
    assert.deepEqual(p.zeilen.map((z) => z.id), ['alt-offen', 'neu-u16']);
  });
});

describe('R4 Eltern-Übersicht bei abgelaufenem Link', () => {
  const r = { name: 'Gigi Bianchi', spitzname: 'Turbo', foto_pfad: 'x.jpg', altersstufe: 'unter16', wand_optin: true, sprache: 'it' };
  test('abgelaufen → nur { ok, gueltig: false }', () => {
    assert.deepEqual(elternUebersicht({ ...r, token_ablauf: iso(NOW - 1) }, NOW), { ok: true, gueltig: false });
  });
  test('gültig → Übersicht mit Angebot', () => {
    const u = elternUebersicht({ ...r, token_ablauf: iso(NOW + TAG) }, NOW);
    assert.equal(u.gueltig, true);
    assert.equal(u.name, 'Gigi B.');
    assert.deepEqual(u.angebot, ['mitglied', 'wall_name', 'foto']);
  });
});

describe('R5 erneute Anmeldung verlängert nichts', () => {
  test('Fälle', () => {
    assert.equal(doppelteAnmeldung({ altersstufe: '18plus', optin_bestaetigt: true, created_at: iso(NOW - 99 * TAG) }, NOW), 'schon_dabei');
    assert.equal(doppelteAnmeldung({ altersstufe: 'unter16', optin_bestaetigt: true, eltern_bestaetigt_am: iso(NOW), created_at: iso(NOW - TAG) }, NOW), 'schon_dabei');
    assert.equal(doppelteAnmeldung({ altersstufe: 'unter16', created_at: iso(NOW - 2 * TAG), token_ablauf: iso(NOW + 5 * TAG) }, NOW), 'erneut_senden');
    // auch wenn der Link (z. B. durch eine frühere Verlängerung) noch gilt: älter als 7 Tage → neu anlegen
    assert.equal(doppelteAnmeldung({ altersstufe: 'unter16', created_at: iso(NOW - 8 * TAG), token_ablauf: iso(NOW + 5 * TAG) }, NOW), 'neu_anlegen');
    assert.equal(doppelteAnmeldung({ altersstufe: '18plus', optin_bestaetigt: false, created_at: iso(NOW - 3 * TAG), token_ablauf: iso(NOW - 1) }, NOW), 'neu_anlegen');
  });
});

describe('R6 Minderjährige: kein frei eingetippter Anzeigename', () => {
  test('angezeigter_name wird bei Minderjährigen ignoriert, bei Erwachsenen genutzt', () => {
    assert.equal(anzeigeName({ name: 'Gigi Bianchi', angezeigter_name: 'Gigi Bianchi aus Müllheim', altersstufe: '16bis17' }), 'Gigi B.');
    assert.equal(anzeigeName({ name: 'Gigi Bianchi', angezeigter_name: 'Gigi Bianchi', minderjaehrig: true }), 'Gigi B.');
    assert.equal(anzeigeName({ name: 'Gigi Bianchi', angezeigter_name: 'X', spitzname: 'Turbo', name_freigegeben: true, altersstufe: 'unter16' }), 'Turbo');
    assert.equal(anzeigeName({ name: 'Marco Rossi', angezeigter_name: 'Marco R. (Team)', altersstufe: '18plus' }), 'Marco R. (Team)');
    const u16 = { ...erw({ altersstufe: 'unter16', minderjaehrig: true, angezeigter_name: 'Voller Name Kind' }), ...elternJa({ mitglied: true, wall_name: true }) };
    assert.equal(wallEintrag(u16).name, 'Marco R.');
  });
});
