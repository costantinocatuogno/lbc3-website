// Regressionstests auf Ebene der Netlify Functions (R1, R2, R4, R5) – mit nachgebautem Supabase/Brevo, ohne Netzwerk.
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const db = []; const storage = new Map(); const mails = [];
const match = (r, q) => { for (const [k, v] of q) { if (['select', 'order', 'limit'].includes(k)) continue; const [op, ...rest] = v.split('.'); const val = rest.join('.'); if (op === 'eq' && String(r[k]) !== val) return false; if (op === 'lt' && !(String(r[k]) < val)) return false; } return true; };
const res = (data, status = 200, ct = 'application/json') => new Response(data instanceof Uint8Array || typeof data === 'string' ? data : JSON.stringify(data), { status, headers: { 'content-type': ct } });
globalThis.fetch = async (u, o = {}) => {
  const url = new URL(u); const { pathname: path, searchParams: q } = url; const m = o.method || 'GET';
  if (u.startsWith('https://api.brevo.com')) { mails.push(JSON.parse(o.body)); return res({}); }
  if (path === '/auth/v1/user') return res({ id: 'admin1', email: 'a@x' });
  if (path === '/rest/v1/profiles') return res([{ rolle: 'admin' }]);
  if (path.startsWith('/storage/v1/object/')) {
    const key = path.slice('/storage/v1/object/'.length);
    if (m === 'POST') { storage.set(key, Buffer.from(o.body)); return res({}); }
    if (m === 'DELETE') { for (const p of JSON.parse(o.body).prefixes) storage.delete(`${key}/${p}`); return res([]); }
    return storage.has(key) ? res(new Uint8Array(storage.get(key)), 200, 'image/jpeg') : res({}, 404);
  }
  if (path === '/rest/v1/squadra_tre') {
    if (m === 'GET') { let rows = db.filter((r) => match(r, q)); if (q.get('limit')) rows = rows.slice(0, Number(q.get('limit'))); return res(rows.map((r) => ({ ...r }))); }
    if (m === 'POST') { const row = { id: randomUUID(), token: randomUUID(), eltern_token: randomUUID(), verwalten_token: randomUUID(), created_at: new Date().toISOString(), optin_bestaetigt: false, foto_freigegeben: false, ausgeblendet: false, ...JSON.parse(o.body) }; db.push(row); return res([row], 201); }
    if (m === 'PATCH') { const b = JSON.parse(o.body); db.filter((r) => match(r, q)).forEach((r) => Object.assign(r, b)); return res(''); }
    if (m === 'DELETE') { for (let i = db.length - 1; i >= 0; i--) if (match(db[i], q)) db.splice(i, 1); return res(''); }
  }
  throw new Error(`nicht nachgebaut: ${m} ${u}`);
};
Object.assign(process.env, { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', MAIL_FROM: 'x@lbc3.test', BREVO_API_KEY: 'k', URL: 'https://site.test' });
delete process.env.NETLIFY_BUILD_HOOK_URL;
const warn = console.warn; console.warn = () => {}; // Blobs fehlen im Test absichtlich

let join, eltern, anfordern, aufraeumen;
before(async () => {
  join = (await import('../netlify/functions/squadra-join.mjs')).default;
  eltern = (await import('../netlify/functions/squadra-eltern.mjs')).default;
  anfordern = (await import('../netlify/functions/squadra-eltern-anfordern.mjs')).default;
  aufraeumen = (await import('../netlify/functions/squadra-cleanup.mjs')).aufraeumen;
});
beforeEach(() => { db.length = 0; storage.clear(); mails.length = 0; });

const TAG = 864e5;
const t = () => String(Date.now() - 10000);
const form = (f) => { const fd = new FormData(); for (const [k, v] of Object.entries({ lang: 'de', t: t(), datenschutz: '1', ...f })) fd.append(k, v); return new Request('https://site.test/api/squadra-join', { method: 'POST', headers: { accept: 'application/json' }, body: fd }); };
const post = (path, body, h = {}) => new Request(`https://site.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
const ctx = () => ({ ip: randomUUID() });

describe('R2 Anmeldung verrät nicht, ob eine Adresse existiert', () => {
  test('gleiche Antwort für neue, offene und bestätigte Adressen – immer mit der eingegebenen Altersstufe', async () => {
    const eingabe = { name: 'Anna Bianchi', email: 'anna@x.de', alter: '18plus' };
    const neu = await (await join(form(eingabe), ctx())).json();
    db.push({ id: randomUUID(), verwalten_token: randomUUID(), name: 'Kind K', email: 'kind@x.de', altersstufe: 'unter16', minderjaehrig: true, optin_bestaetigt: true, eltern_bestaetigt_am: new Date().toISOString(), created_at: new Date(Date.now() - 30 * TAG).toISOString(), sprache: 'de' });
    const bestaetigt = await (await join(form({ ...eingabe, email: 'kind@x.de' }), ctx())).json();
    const offen = await (await join(form({ ...eingabe }), ctx())).json();
    assert.deepEqual(neu, { ok: true, stufe: '18plus' });
    assert.deepEqual(bestaetigt, neu);
    assert.deepEqual(offen, neu);
  });
});

describe('R5 erneute Anmeldung', () => {
  test('offen und jung: gleiche Zeile, Gültigkeit unverändert, Mail erneut', async () => {
    await join(form({ name: 'Gigi Bianchi', email: 'gigi@x.de', alter: 'unter16', eltern_email: 'm@x.de' }), ctx());
    const ablauf = db[0].token_ablauf; mails.length = 0;
    await join(form({ name: 'Gigi Bianchi', email: 'gigi@x.de', alter: 'unter16', eltern_email: 'm@x.de' }), ctx());
    assert.equal(db.length, 1);
    assert.equal(db[0].token_ablauf, ablauf);
    assert.equal(mails.length, 2);
  });
  test('offen und älter als 7 Tage: alte Zeile samt Foto gelöscht, neue angelegt', async () => {
    const altId = randomUUID();
    db.push({ id: altId, token: randomUUID(), eltern_token: randomUUID(), verwalten_token: randomUUID(), name: 'Gigi Bianchi', email: 'gigi@x.de', altersstufe: 'unter16', minderjaehrig: true, optin_bestaetigt: false, foto_pfad: `${altId}.jpg`, created_at: new Date(Date.now() - 8 * TAG).toISOString(), token_ablauf: new Date(Date.now() + 5 * TAG).toISOString(), sprache: 'de' });
    storage.set(`squadra/${altId}.jpg`, Buffer.from('x'));
    await join(form({ name: 'Gigi Bianchi', email: 'gigi@x.de', alter: 'unter16', eltern_email: 'm@x.de' }), ctx());
    assert.equal(db.length, 1);
    assert.notEqual(db[0].id, altId);
    assert.ok(!storage.has(`squadra/${altId}.jpg`));
    assert.ok(new Date(db[0].token_ablauf) - Date.now() <= 7 * TAG + 1000);
  });
});

describe('R1 Eltern-Bestätigung für alte bestätigte Minderjährige', () => {
  test('setzt keine Altersstufe, Mail kündigt keine Löschung an, Aufräumen löscht nicht', async () => {
    const id = randomUUID();
    db.push({ id, verwalten_token: randomUUID(), eltern_token: randomUUID(), name: 'Luca Verdi', email: null, altersstufe: null, minderjaehrig: true, optin_bestaetigt: true, foto_pfad: `${id}.jpg`, created_at: new Date(Date.now() - 300 * TAG).toISOString(), sprache: 'de' });
    storage.set(`squadra/${id}.jpg`, Buffer.from('x'));
    const r = await anfordern(post('/api/squadra-eltern-anfordern', { id, eltern_email: 'mama@x.de' }, { authorization: 'Bearer tok' }));
    assert.equal(r.status, 200);
    assert.equal(db[0].altersstufe, null);
    const html = mails[0].htmlContent;
    assert.match(html, /bleibt der Eintrag Ihres Kindes auf der Wall of Fame verborgen/);
    assert.doesNotMatch(html, /löschen wir/);
    db[0].token_ablauf = new Date(Date.now() - TAG).toISOString(); // Link ist abgelaufen, Eltern haben nicht reagiert
    await aufraeumen();
    assert.equal(db.length, 1);
    assert.ok(storage.has(`squadra/${id}.jpg`));
  });
});

describe('R4 Eltern-Seite mit abgelaufenem Link', () => {
  test('liefert keine Angaben zum Kind', async () => {
    const tok = randomUUID();
    db.push({ id: randomUUID(), eltern_token: tok, name: 'Gigi Bianchi', spitzname: 'Turbo', foto_pfad: 'x.jpg', altersstufe: 'unter16', minderjaehrig: true, wand_optin: true, created_at: new Date(Date.now() - 9 * TAG).toISOString(), token_ablauf: new Date(Date.now() - TAG).toISOString() });
    const j = await (await eltern(new Request(`https://site.test/api/squadra-eltern?t=${tok}`))).json();
    assert.deepEqual(j, { ok: true, gueltig: false });
  });
});

process.on('exit', () => { console.warn = warn; });
