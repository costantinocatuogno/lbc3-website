// © 2026 LBC3
// Tests für die Video-Untertitel in der Sprache des Besuchers. Ausführen: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { untertitelSrc, untertitelTrack } from '../scripts/lib/untertitel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'uploads', 'videos', 'untertitel');
const SPRACHEN = ['it', 'en', 'fr'];
const toSec = (t) => { const [h, m, s] = t.split(':'); return +h * 3600 + +m * 60 + +s; };

function cues(file) {
  const txt = readFileSync(file, 'utf8');
  assert.ok(txt.startsWith('WEBVTT'), `${file}: Kopfzeile WEBVTT fehlt`);
  return txt.split(/\n\n+/).filter((b) => b.includes('-->')).map((b) => {
    const lines = b.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    const m = lines[i].match(/^(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})(.*)$/);
    assert.ok(m, `${file}: Zeitangabe ungültig: ${lines[i]}`);
    return { start: toSec(m[1]), end: toSec(m[2]), settings: m[3], text: lines.slice(i + 1).join('\n').trim() };
  });
}

const videos = [...new Set(readdirSync(DIR).filter((f) => f.endsWith('.vtt')).map((f) => f.replace(/\.(it|en|fr)\.vtt$/, '')))];

describe('Untertitel-Dateien', () => {
  test('es gibt Untertitel', () => assert.ok(videos.length >= 1));
  for (const v of videos) {
    test(`${v}: Video vorhanden und alle Sprachen gleich aufgebaut`, () => {
      assert.ok(existsSync(join(ROOT, 'public', 'uploads', 'videos', `${v}.mp4`)), `Video ${v}.mp4 fehlt`);
      const all = SPRACHEN.map((l) => cues(join(DIR, `${v}.${l}.vtt`)));
      for (const c of all) {
        assert.equal(c.length, all[0].length, 'gleiche Anzahl Untertitel in allen Sprachen');
        c.forEach((q, i) => {
          assert.ok(q.text, 'Untertitel ohne Text');
          assert.ok(q.end > q.start, 'Ende vor Anfang');
          assert.match(q.settings, /line:-1/, 'Untertitel müssen ganz unten stehen (line:-1)');
          assert.equal(q.start, all[0][i].start); assert.equal(q.end, all[0][i].end);
          if (i) assert.ok(q.start >= c[i - 1].end, 'Untertitel überlappen');
        });
      }
    });
  }
});

describe('Einbau in die Seiten', () => {
  const vid = `/uploads/videos/${videos[0]}.mp4`;
  test('Deutsch bekommt keine Spur (Untertitel sind eingebrannt)', () => {
    assert.equal(untertitelSrc(vid, 'de'), '');
    assert.equal(untertitelTrack(vid, 'de'), '');
  });
  test('IT/EN/FR bekommen die passende Spur, standardmäßig an', () => {
    for (const l of SPRACHEN) {
      const t = untertitelTrack(vid, l);
      assert.match(t, new RegExp(`srclang="${l}"`));
      assert.match(t, new RegExp(`${videos[0]}\\.${l}\\.vtt`));
      assert.match(t, / default>$/);
    }
  });
  test('Videos ohne Untertitel-Datei bekommen keine Spur', () => {
    assert.equal(untertitelTrack('/uploads/videos/reel-renntag.mp4', 'en'), '');
    assert.equal(untertitelTrack('https://example.com/x.mp4', 'en'), '');
  });
});
