// © 2026 LBC3
// Squadra Tre im Team-Bereich: alle Registrierten zählen als Fan bzw. Unterstützer (Wunsch des Eigentümers, 10.11.2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wallEintrag, mailEmpfaenger } from '../netlify/functions/_lib/squadra-rules.mjs';

const auth = readFileSync(new URL('../public/assets/js/auth.js', import.meta.url), 'utf8');
const secure = readFileSync(new URL('../scripts/templates/secure.mjs', import.meta.url), 'utf8');
const bericht = readFileSync(new URL('../netlify/functions/squadra-wochenbericht.mjs', import.meta.url), 'utf8');

test('Fan-/Unterstützer-Zahlen zählen alle Registrierten, nicht nur bestätigte', () => {
  assert.match(auth, /data-sk="gesamt"\]'\)\.textContent = data\.length/);
  assert.match(auth, /data-sk="freund"\]'\)\.textContent = data\.filter\(\(r\) => !istUnterstuetzer\(r\)\)/);
  assert.match(auth, /data-sk="unterstuetzer"\]'\)\.textContent = data\.filter\(istUnterstuetzer\)/);
  assert.match(auth, /data-sk="offen"\]'\)\.textContent = data\.length - ok\.length/);
});

test('Jeder Eintrag ohne „unterstuetzer“ gilt als Fan (auch leer/alt)', () => {
  const m = auth.match(/const istUnterstuetzer = \(r\) => (.+);/);
  assert.ok(m, 'Hilfsfunktion fehlt');
  const istUnterstuetzer = new Function('r', `return ${m[1]};`);
  assert.equal(istUnterstuetzer({ mitgliedschaft: 'unterstuetzer' }), true);
  for (const r of [{ mitgliedschaft: 'freund' }, { mitgliedschaft: null }, {}, { mitgliedschaft: 'xyz' }]) assert.equal(istUnterstuetzer(r), false);
  assert.match(auth, /sFilter === 'freund' && istUnterstuetzer\(r\)/);
  assert.match(auth, /'<span>Fan<\/span>'/);
});

test('E-Mail-Updates zählen weiter nur bestätigte Mitglieder', () => {
  assert.match(auth, /data-updates-count\]'\)\.textContent = ok\.filter/);
});

test('Team-Bereich beschriftet „Fans“ und zeigt „davon unbestätigt“', () => {
  assert.match(secure, /<span>Mitglieder registriert<\/span>/);
  assert.match(secure, /data-sk="offen"/);
  assert.match(secure, /<span>Fans<\/span>/);
  assert.match(secure, /data-f="freund">Fans</);
});

test('Wochenbericht nennt Fans „Fan“, auch ohne Wert', () => {
  assert.match(bericht, /freund: 'Fan'/);
  assert.match(bericht, /ART\[r\.mitgliedschaft\] \|\| ART\.freund/);
});

test('Wall of Fame und Rundmails bleiben bei unbestätigten Anmeldungen zu (Verhalten)', () => {
  const basis = { id: 'x', name: 'Marco Rossi', email: 'm@example.com', altersstufe: '18plus', wand_optin: true, updates_optin: true, jahresbericht_optin: true };
  assert.equal(wallEintrag({ ...basis, optin_bestaetigt: false }), null);
  assert.notEqual(wallEintrag({ ...basis, optin_bestaetigt: true }), null);
  assert.equal(mailEmpfaenger([{ ...basis, optin_bestaetigt: false }], 'updates').length, 0);
  assert.equal(mailEmpfaenger([{ ...basis, optin_bestaetigt: true }], 'updates').length, 1);
  assert.equal(mailEmpfaenger([{ ...basis, optin_bestaetigt: false }], 'jahresbericht').length, 0);
});

test('Wochenbericht nennt die Gesamtzahl „bestätigt“', () => {
  assert.match(bericht, /Squadra Tre gesamt \(bestätigt\)/);
});
