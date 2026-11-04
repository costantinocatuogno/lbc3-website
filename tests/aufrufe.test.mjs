// © 2026 LBC3
// Tests für den Aufrufzähler (Bauteil-Liste, Bild-/Video-Zählung, Team-Bereich). Ausführen: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seitenPfad, spracheVon, medienPfad, seitenTyp, bauteileAusSeiten } from '../scripts/lib/bauteile.mjs';
import { pruefeEreignis, zusammenfassen, addieren } from '../netlify/functions/_lib/medien-zahlen.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('Adressen zusammenfassen', () => {
  test('Sprachfassungen ergeben dieselbe Seite', () => {
    for (const p of ['/news/x/', '/it/news/x/', '/en/news/x', '/fr/news/x/?a=1#b', '/news/x/index.html']) assert.equal(seitenPfad(p), '/news/x/');
    assert.equal(seitenPfad('/'), '/');
    assert.equal(seitenPfad('/it/'), '/');
    assert.equal(seitenPfad('/it'), '/');
  });
  test('Sprache aus der Adresse', () => {
    assert.equal(spracheVon('/it/news/x/'), 'it');
    assert.equal(spracheVon('/fr'), 'fr');
    assert.equal(spracheVon('/news/x/'), 'de');
    assert.equal(spracheVon('/italia/'), 'de');
  });
  test('Art der Seite', () => {
    assert.equal(seitenTyp('/news/x/'), 'artikel');
    assert.equal(seitenTyp('/news/'), 'seite');
    assert.equal(seitenTyp('/galerie/sakc/2026/'), 'galerie');
    assert.equal(seitenTyp('/kontakt/'), 'seite');
  });
  test('Bild über Netlify-Verkleinerung = Originaldatei', () => {
    assert.equal(medienPfad('/.netlify/images?url=%2Fuploads%2Fgalerie%2Fa%20b.jpg&amp;w=1800&amp;q=78'), '/uploads/galerie/a b.jpg');
    assert.equal(medienPfad('https://luigi-catuogno.com/uploads/videos/x.mp4?v=1'), '/uploads/videos/x.mp4');
    assert.equal(medienPfad('/uploads/../netlify.toml'), '');
    assert.equal(medienPfad('https://evil.example/x.jpg'), '');
    assert.equal(medienPfad('/assets/logo.svg'), '');
  });
});

describe('Bauteil-Liste aus den Seiten', () => {
  const html = `<title>Wackersdorf 2026 · SAKC · LBC3 Luigi Battista Catuogno</title>
    <button type="button" class="masonry-item" data-lightbox-index="0" data-full="/.netlify/images?url=%2Fuploads%2Fgalerie%2Fa.jpg&amp;w=1800" data-video="false" data-caption="Start · Foto: X">
    <button type="button" class="masonry-item" data-lightbox-index="1" data-full="/uploads/galerie/v1.mp4" data-video="true" data-caption="Video: Start"><video src="/uploads/galerie/v1.mp4" muted playsinline preload="metadata"></video></button>
    <video data-intro-video src="/uploads/videos/intro.mp4" muted playsinline preload="auto"></video>
    <video data-reel-video src="/uploads/videos/r1.mp4" controls playsinline></video>
    <button type="button" class="reel-item" data-reel-src="/uploads/videos/r1.mp4" data-reel-titel="Renntag">
    <figure class="film"><video src="/uploads/videos/film.mp4" controls preload="none"></video>
    <figcaption><strong>Die Story</strong></figcaption></figure>`;
  const liste = bauteileAusSeiten([{ pfad: '/galerie/sakc/2026/wackersdorf/', html }, { pfad: '/', html: '<title>x</title>' }]);
  const finde = (id) => liste.find((x) => x.id === id);
  test('Seiten mit Titel und Art', () => {
    assert.deepEqual(finde('/galerie/sakc/2026/wackersdorf/'), { typ: 'galerie', id: '/galerie/sakc/2026/wackersdorf/', titel: 'Wackersdorf 2026 · SAKC', seite: '/galerie/sakc/2026/wackersdorf/' });
    assert.equal(finde('/').titel, 'Startseite');
  });
  test('Bilder und Videos mit Titel', () => {
    assert.equal(finde('/uploads/galerie/a.jpg').typ, 'bild');
    assert.equal(finde('/uploads/galerie/a.jpg').titel, 'Start');
    assert.equal(finde('/uploads/galerie/v1.mp4').typ, 'video');
    assert.equal(finde('/uploads/videos/r1.mp4').titel, 'Renntag');
    assert.equal(finde('/uploads/videos/film.mp4').titel, 'Die Story');
  });
  test('Intro-Video zählt nicht, jedes Bauteil nur einmal', () => {
    assert.equal(finde('/uploads/videos/intro.mp4'), undefined);
    assert.equal(liste.filter((x) => x.id === '/uploads/videos/r1.mp4').length, 1);
  });
});

describe('Zählung Bilder/Videos', () => {
  const erlaubt = new Set(['/uploads/galerie/a.jpg', '/uploads/videos/r1.mp4']);
  test('nur bekannte Dateien und passende Art', () => {
    assert.deepEqual(pruefeEreignis({ m: '/uploads/galerie/a.jpg', a: 'auf', l: 'it' }, erlaubt), { m: '/uploads/galerie/a.jpg', a: 'auf', l: 'it' });
    assert.equal(pruefeEreignis({ m: '/uploads/galerie/b.jpg', a: 'auf' }, erlaubt), null);
    assert.equal(pruefeEreignis({ m: '/uploads/galerie/a.jpg', a: 'start' }, erlaubt), null);
    assert.equal(pruefeEreignis({ m: '/uploads/videos/r1.mp4', a: 'auf' }, erlaubt), null);
    assert.equal(pruefeEreignis({ m: '/uploads/videos/r1.mp4', a: 'ende', l: 'xx' }, erlaubt).l, 'de');
    assert.equal(pruefeEreignis(null, erlaubt), null);
  });
  test('es wird nichts Persönliches gespeichert', () => {
    const e = pruefeEreignis({ m: '/uploads/galerie/a.jpg', a: 'auf', l: 'de', ip: '1.2.3.4', ua: 'x' }, erlaubt);
    assert.deepEqual(Object.keys(e).sort(), ['a', 'l', 'm']);
  });
  test('zusammenfassen und addieren', () => {
    const t1 = zusammenfassen([{ m: 'v', a: 'start', l: 'de' }, { m: 'v', a: 'start', l: 'it' }, { m: 'v', a: 'ende', l: 'de' }, null]);
    assert.deepEqual(t1, { v: { n: 2, e: 1, l: { de: 1, it: 1 } } });
    assert.deepEqual(addieren([t1, null, { v: { n: 1, e: 0, l: { it: 1 } } }]), { v: { n: 3, e: 1, l: { de: 1, it: 2 } } });
  });
});

describe('Einbau', () => {
  const site = readFileSync(join(ROOT, 'public/assets/js/site.js'), 'utf8');
  const auth = readFileSync(join(ROOT, 'public/assets/js/auth.js'), 'utf8');
  const secure = readFileSync(join(ROOT, 'scripts/templates/secure.mjs'), 'utf8');
  test('Website zählt Großansicht und Video-Start/-Ende, respektiert „nicht mitzählen“', () => {
    assert.match(site, /lbc3MediumZaehlen\(b\.dataset\.full, 'auf'\)/);
    assert.match(site, /'start'\)/);
    assert.match(site, /'ende'\)/);
    assert.match(site, /lbc3-nicht-zaehlen/);
    assert.match(site, /data-intro-video/);
  });
  test('Team-Bereich hat den Reiter Aufrufe', () => {
    assert.match(secure, /data-tab="aufrufe"/);
    assert.match(secure, /data-panel="aufrufe"/);
    assert.match(auth, /name === 'aufrufe'\) loadAufrufe\(\)/);
  });
  test('Datenschutzerklärung nennt die Zählung in allen Sprachen', () => {
    const s = JSON.parse(readFileSync(join(ROOT, 'content/einstellungen/site.json'), 'utf8'));
    assert.match(s.datenschutz, /Bilder in der Großansicht/);
    assert.match(s.datenschutz_en, /enlarged view/);
    assert.match(s.datenschutz_it, /schermo intero/);
    assert.match(s.datenschutz_fr, /grand format/);
  });
});
