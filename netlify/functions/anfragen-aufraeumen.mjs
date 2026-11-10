// © 2026 LBC3
// Speicherfristen der Anfragen-Kartei (nachts 02:20 UTC):
//   – Anfragen mit Label „Spam“: nach 30 Tagen gelöscht
//   – erledigte Anfragen: 12 Monate nach „erledigt“ gelöscht
// Offene Anfragen mit Label „OK“ bleiben, bis sie erledigt oder von Hand gelöscht werden.
// Fristen sind ein Vorschlag von R&D – Bestätigung durch das LBC3 Rechts-Recherche-Team steht aus.
import { sb } from './_lib/common.mjs';

export const SPAM_TAGE = 30;
export const ERLEDIGT_TAGE = 365;

export default async () => {
  const vor = (tage) => encodeURIComponent(new Date(Date.now() - tage * 24 * 3600 * 1000).toISOString());
  await sb(`/rest/v1/kontakt_anfragen?status=eq.spam&created_at=lt.${vor(SPAM_TAGE)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await sb(`/rest/v1/kontakt_anfragen?erledigt_am=lt.${vor(ERLEDIGT_TAGE)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return new Response('Anfragen aufgeräumt');
};

export const config = { schedule: '20 2 * * *' };
