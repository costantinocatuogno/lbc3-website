// © 2026 LBC3
// Tests für den Bildschutz (kein Kopieren/Teilen von Bildern per langem Drücken, Rechtsklick, Ziehen). Ausführen: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'public/assets/css/site.css'), 'utf8');
const js = readFileSync(join(ROOT, 'public/assets/js/site.js'), 'utf8');

describe('Bildschutz CSS (iPhone/iPad und alle Seiten mit site.css, auch Squadra Tre)', () => {
  test('langes Drücken auf Bilder/Videos ohne Menü', () => {
    assert.match(css, /img, video, picture[^{]*\{[^}]*-webkit-touch-callout:\s*none/);
  });
  test('Bilder nicht markierbar und nicht ziehbar', () => {
    assert.match(css, /img, video, picture[^{]*\{[^}]*user-select:\s*none[^}]*-webkit-user-drag:\s*none/);
  });
  test('auch Links/Knöpfe mit Bild (Galerie, Wall of Fame) ohne Menü', () => {
    assert.match(css, /a:has\(img[^{]*\{[^}]*-webkit-touch-callout:\s*none/);
  });
});

describe('Bildschutz JS (Android und Desktop)', () => {
  test('Kontextmenü auf Medien gesperrt', () => assert.match(js, /addEventListener\('contextmenu'[^\n]*preventDefault/));
  test('Ziehen von Medien gesperrt', () => assert.match(js, /addEventListener\('dragstart'[^\n]*preventDefault/));
  test('Videos ohne Herunterladen-Knopf', () => assert.match(js, /controlslist', 'nodownload/));
  test('auch nachgeladene Bilder (Wall of Fame, Großansicht) erfasst', () => assert.match(js, /MutationObserver/));
  test('Schutz steht vor allen anderen Funktionen (läuft auch, wenn später etwas fehlschlägt)', () => {
    assert.ok(js.indexOf("'contextmenu'") < js.indexOf('Besucherzählung'));
  });
});
