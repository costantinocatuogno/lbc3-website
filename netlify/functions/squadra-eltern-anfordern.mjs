// Team-Bereich (nur Admins): Eltern-Bestätigung (erneut) anfordern (L8, L14).
// Vergibt einen frischen eltern_token mit neuer Gültigkeit (7 Tage) und schickt die Eltern-E-Mail.
// POST { id, eltern_email? } – eltern_email setzt bzw. ersetzt die gespeicherte Adresse eines Elternteils.
import { randomUUID } from 'node:crypto';
import { handle, json, sb, requireAdmin, readBody, HttpError } from './_lib/common.mjs';
import { neuerAblauf, istMinderjaehrig } from './_lib/squadra-rules.mjs';
import { sendeElternMail } from './_lib/squadra-mail.mjs';

const UUID = /^[0-9a-f-]{36}$/i;
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  await requireAdmin(req);
  const b = await readBody(req);
  if (!UUID.test(String(b.id || ''))) throw new HttpError(400, 'Ungültige ID.');
  const row = (await sb(`/rest/v1/squadra_tre?id=eq.${b.id}&select=*`))?.[0];
  if (!row) throw new HttpError(404, 'Eintrag nicht gefunden.');
  if (!istMinderjaehrig(row)) throw new HttpError(400, 'Nur für Minderjährige nötig.');
  const neueMail = String(b.eltern_email || '').trim().toLowerCase();
  const eltern = neueMail || row.einwilligung_eltern || '';
  if (!MAIL.test(eltern)) throw new HttpError(400, 'Bitte die E-Mail-Adresse eines Elternteils angeben.');
  if (row.email && eltern === String(row.email).toLowerCase()) throw new HttpError(400, 'Die Eltern-Adresse muss sich von der Adresse des Kindes unterscheiden.');
  // Altersstufe wird hier NIE gesetzt: alte Einträge (ohne Altersstufe) gelten für die Anzeige als „unter 16“,
  // bleiben bis zur Zustimmung nur verborgen und werden vom Aufräumen nicht gelöscht (R1).
  const patch = { eltern_token: randomUUID(), token_ablauf: neuerAblauf(), einwilligung_eltern: eltern };
  await sb(`/rest/v1/squadra_tre?id=eq.${row.id}`, { method: 'PATCH', body: patch });
  await sendeElternMail({ ...row, ...patch });
  return json({ ok: true, an: eltern });
});

export const config = { path: '/api/squadra-eltern-anfordern' };
