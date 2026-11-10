// © 2026 LBC3
// Tests für die Anmeldeseite: Besucher sehen nur den Partner-Login, Team-Geräte nur den Admin-Login,
// und der Team-Bereich hat eine Vorschau des Partner-Logins. Ausführen: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginPage, teamPage } from '../scripts/templates/secure.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(join(ROOT, 'public/assets/js/auth.js'), 'utf8');
const ctx = { content: { site: { login_bild: '' } } };
const LANGS = ['de', 'it', 'en', 'fr'];

const vorschauTeil = (html) => html.slice(html.indexOf('data-panel="partneransicht"'));

describe('Anmeldeseite (alle Sprachen)', () => {
  for (const l of LANGS) {
    const html = loginPage(ctx, l);
    test(`${l}: keine Reiter Partner/Admin mehr`, () => {
      assert.doesNotMatch(html, /data-role-tab|class="segmented"/);
    });
    test(`${l}: Admin-Hinweis ist versteckt, Partner-Hinweis steht da`, () => {
      assert.match(html, /data-team-label hidden/);
      assert.match(html, /data-role-hint/);
    });
    test(`${l}: Login-Formular funktioniert weiter (E-Mail, Passwort, Link, Zurücksetzen)`, () => {
      for (const a of ['data-login-form', 'name="email"', 'name="password"', 'data-magic', 'data-reset', 'data-setpw-form', 'data-msg']) assert.ok(html.includes(a), a);
    });
  }
});

describe('Logik in auth.js', () => {
  test('Team-Gerät nur über die Markierung in diesem Browser', () => {
    assert.match(js, /TEAM_KEY = 'lbc3-team-geraet'/);
    assert.match(js, /const team = istTeamGeraet\(\) && !nurPartner/);
  });
  test('Admins landen immer im Team-Bereich (auch über den Partner-Login)', () => {
    assert.match(js, /p\.rolle === 'admin'\) location\.href = '\/team\/'/);
  });
  test('?ansicht=partner zeigt den Partner-Login ohne automatische Weiterleitung', () => {
    assert.match(js, /get\('ansicht'\) === 'partner'/);
    assert.match(js, /if \(session && !nurPartner\) goToArea\(\)/);
  });
  test('Rechte kommen weiter aus dem Profil (Supabase), nicht aus der Markierung', () => {
    assert.match(js, /else if \(p\.rolle === 'sponsor'\)/);
    assert.match(js, /if \(!p \|\| !allowed\.includes\(p\.rolle\)\)/);
  });
});

describe('Team-Bereich: Partner-Ansicht', () => {
  const html = teamPage(ctx);
  const pv = vorschauTeil(html);
  test('Reiter und Bereich vorhanden', () => {
    assert.match(html, /data-tab="partneransicht"/);
    assert.match(html, /data-panel="partneransicht" hidden/);
  });
  test('Vorschau in allen vier Sprachen, nur Deutsch zuerst sichtbar', () => {
    for (const l of LANGS) assert.match(pv, new RegExp(`data-pv-box="${l}"`));
    assert.equal((pv.match(/data-pv-box="[a-z]{2}"[^>]*inert>/g) || []).length, 1);
  });
  test('Vorschau ist inert und enthält keine echten Login-Kennungen (auth.js fasst sie nicht an)', () => {
    assert.match(pv, /class="lbc3-pv"[^>]*inert/);
    const boxen = pv.slice(pv.indexOf('class="lbc3-pv"'), pv.indexOf('data-geraet-team'));
    for (const a of ['data-login-form', 'data-msg', 'data-magic', 'data-reset', 'data-set-lang', 'data-setpw-form', 'data-team-label', 'name="password"', '<h1']) assert.ok(!boxen.includes(a), a);
  });
  test('Gerät markieren: Häkchen und Hinweis', () => {
    assert.match(html, /data-geraet-team/);
    assert.match(html, /data-geraet-hinweis hidden/);
    assert.match(html, /data-geraet-markieren/);
  });
});
