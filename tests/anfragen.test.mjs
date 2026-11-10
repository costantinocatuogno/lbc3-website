// © 2026 LBC3
// Tests für die Anfragen-Kartei (Kontaktformular → Supabase, Spam-Prüfung, Team-Bereich). Ausführen: npm test
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeAnfrage, SPAM_GRENZE } from '../netlify/functions/_lib/spam.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lies = (p) => readFileSync(join(ROOT, p), 'utf8');

const ECHT = {
  name: 'Anna Keller', email: 'anna.keller@autohaus-keller.de', firma: 'Autohaus Keller GmbH',
  nachricht: 'Guten Tag, wir sind ein Autohaus aus Müllheim und würden Luigi in der Saison 2027 gern unterstützen. Können Sie uns die Partnermappe schicken? Viele Grüße, Anna Keller'
};

describe('Spam-Prüfung', () => {
  test('echte Sponsoranfrage ist OK', () => {
    const r = pruefeAnfrage(ECHT);
    assert.equal(r.status, 'ok');
    assert.equal(r.wert, 0);
    assert.deepEqual(r.gruende, []);
  });
  test('typische SEO-Werbung ist Spam', () => {
    const r = pruefeAnfrage({ name: 'John', email: 'john@seo-pro.xyz', nachricht: 'Hi, I can get your website on the first page of Google with SEO and backlinks. Increase traffic now: https://a.xyz https://b.xyz https://c.xyz' });
    assert.equal(r.status, 'spam');
    assert.ok(r.wert >= SPAM_GRENZE);
    assert.ok(r.gruende.some((g) => g.includes('Links')));
  });
  test('Motorsport-Wörter lösen nichts aus (Ranking, Museo, Sponsor, Marketing)', () => {
    const r = pruefeAnfrage({ ...ECHT, nachricht: 'Ciao, sono del Museo Ferrari: Luigi è nel ranking? Il nostro marketing vorrebbe diventare sponsor.' });
    assert.equal(r.status, 'ok');
    assert.equal(r.wert, 0);
  });
  test('Lockfeld ausgefüllt → Spam', () => {
    assert.equal(pruefeAnfrage({ ...ECHT, honeypot: true }).status, 'spam');
  });
  test('zu schnell abgeschickt allein ist noch kein Spam', () => {
    const r = pruefeAnfrage({ ...ECHT, botZeit: true });
    assert.equal(r.status, 'ok');
    assert.equal(r.wert, 4);
  });
  test('fremde Schrift + Link → Spam', () => {
    assert.equal(pruefeAnfrage({ name: 'Иван', email: 'ivan@mail.ru', nachricht: 'Здравствуйте! Предлагаем продвижение сайта https://x.ru и рекламу' , botZeit: false }).status, 'spam');
  });
  test('Wegwerf-Adresse und Wiederholung zählen', () => {
    const r = pruefeAnfrage({ ...ECHT, email: 'x@mailinator.com' }, { vorherige24h: 2 });
    assert.equal(r.status, 'spam');
    assert.ok(r.gruende.some((g) => g.includes('Wegwerf')));
    assert.ok(r.gruende.some((g) => g.includes('24 Stunden')));
  });
  test('ein einzelner Link in einer echten Anfrage bleibt OK', () => {
    assert.equal(pruefeAnfrage({ ...ECHT, nachricht: ECHT.nachricht + ' Unsere Website: www.autohaus-keller.de' }).status, 'ok');
  });
});

// ---------- Kontaktformular mit nachgestelltem Supabase und Brevo ----------
let aufrufe = [];
let supabaseFehler = false;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  aufrufe.push({ url, method: o.method || 'GET', body: o.body ? JSON.parse(o.body) : null });
  if (url.includes('supabase.co')) {
    if (supabaseFehler && o.method === 'POST') return new Response(JSON.stringify({ message: 'kaputt' }), { status: 500 });
    return new Response(o.method === 'POST' ? '' : '[]', { status: o.method === 'POST' ? 201 : 200 });
  }
  if (url.includes('brevo.com')) return new Response('{}', { status: 201 });
  return new Response('', { status: 404 });
};
Object.assign(process.env, { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', MAIL_FROM: 'x@lbc3.test', BREVO_API_KEY: 'k', URL: 'https://site.test' });
const kontakt = (await import('../netlify/functions/kontakt.mjs')).default;
const senden = (felder) => kontakt(new Request('https://site.test/api/kontakt', {
  method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ sprache: 'de', anliegen: 'sponsoring', datenschutz: 'on', t: Date.now() - 60000, ...felder })
}));
const gespeichert = () => aufrufe.filter((a) => a.url.endsWith('/rest/v1/kontakt_anfragen') && a.method === 'POST');
const mails = () => aufrufe.filter((a) => a.url.includes('brevo.com'));

describe('Kontaktformular speichert in der Kartei', () => {
  beforeEach(() => { aufrufe = []; supabaseFehler = false; });
  test('OK-Anfrage: gespeichert, E-Mail ans Team und Eingangsbestätigung', async () => {
    const res = await senden(ECHT);
    assert.equal(res.status, 200);
    assert.equal(gespeichert().length, 1);
    const row = gespeichert()[0].body;
    assert.equal(row.status, 'ok');
    assert.equal(row.anliegen, 'sponsoring');
    assert.equal(row.email, ECHT.email);
    assert.equal(mails().length, 2);
  });
  test('Spam: nur still in der Kartei, keine E-Mail', async () => {
    const res = await senden({ name: 'John', email: 'john@seo-pro.xyz', nachricht: 'SEO backlinks, first page of Google! https://a.xyz https://b.xyz https://c.xyz' });
    assert.equal(res.status, 200);
    assert.equal(gespeichert().length, 1);
    assert.equal(gespeichert()[0].body.status, 'spam');
    assert.equal(mails().length, 0);
  });
  test('Lockfeld: still als Spam gespeichert, keine E-Mail', async () => {
    await senden({ ...ECHT, 'bot-field': 'x' });
    assert.equal(gespeichert()[0].body.status, 'spam');
    assert.equal(mails().length, 0);
  });
  test('Datenbank kaputt: E-Mail geht trotzdem raus (nichts geht verloren)', async () => {
    supabaseFehler = true;
    const res = await senden(ECHT);
    assert.equal(res.status, 200);
    assert.ok(mails().length >= 1);
  });
  test('Datenbank kaputt und Spam: E-Mail mit Hinweis statt Verlust', async () => {
    supabaseFehler = true;
    await senden({ name: 'John', email: 'john@seo-pro.xyz', nachricht: 'SEO backlinks, first page of Google! https://a.xyz https://b.xyz https://c.xyz' });
    assert.equal(mails().length, 1);
    assert.match(mails()[0].body.subject, /Verdacht auf Spam/);
  });
  test('Pflichtfelder fehlen: nichts gespeichert', async () => {
    const res = await senden({ name: '', email: 'x', nachricht: '' });
    assert.equal(res.status, 400);
    assert.equal(gespeichert().length, 0);
  });
});

describe('Datenbank, Team-Bereich, Datenschutz', () => {
  test('Tabelle nur für Admins, Gegen-Skript vorhanden', () => {
    const sql = lies('supabase/migrations/005_kontakt_anfragen.sql');
    assert.match(sql, /enable row level security/);
    assert.match(sql, /meine_rolle\(\) = 'admin'/);
    assert.match(sql, /status in \('ok', 'spam'\)/);
    assert.ok(existsSync(join(ROOT, 'supabase/migrations/005_kontakt_anfragen_rueckgaengig.sql')));
    assert.match(lies('supabase/migrations/005_kontakt_anfragen_rueckgaengig.sql'), /drop table if exists public\.kontakt_anfragen/);
  });
  test('Reiter „Anfragen“ mit rotem Spam- und grünem OK-Label', () => {
    assert.match(lies('scripts/templates/secure.mjs'), /data-tab="anfragen"/);
    assert.match(lies('scripts/templates/secure.mjs'), /data-panel="anfragen"/);
    const js = lies('public/assets/js/auth.js');
    assert.match(js, /lbc3-label-spam/);
    assert.match(js, /lbc3-label-ok/);
    assert.match(js, /escapeHtml\(a\.nachricht\)/, 'Nachricht wird maskiert ausgegeben');
    const css = lies('public/assets/css/site.css');
    assert.match(css, /\.lbc3-label-spam \{[^}]*var\(--red\)/);
  });
  test('Speicherfristen laufen nachts', () => {
    const f = lies('netlify/functions/anfragen-aufraeumen.mjs');
    assert.match(f, /SPAM_TAGE = 30/);
    assert.match(f, /ERLEDIGT_TAGE = 365/);
    assert.match(f, /schedule:/);
  });
  test('Datenschutzerklärung in DE, EN, IT, FR ergänzt', () => {
    const d = JSON.parse(lies('content/einstellungen/site.json'));
    for (const k of ['datenschutz', 'datenschutz_en', 'datenschutz_it', 'datenschutz_fr']) {
      assert.match(d[k], /Supabase/);
      assert.match(d[k], /30/);
      assert.match(d[k], /12/);
    }
    assert.match(d.datenschutz, /als Spam erkannte Anfragen/i);
  });
});
