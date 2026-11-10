// © 2026 LBC3
// Speicherfristen der Anfragen-Kartei (nachts 02:20 UTC):
//   – Anfragen mit Label „Spam“: 30 Tage nach dem Setzen des Labels gelöscht (status_am)
//   – erledigte Anfragen: 12 Monate nach „erledigt“ gelöscht
//   – nie erledigte Anfragen: spätestens 24 Monate nach Eingang gelöscht (Höchstfrist)
// Fristen sind ein Vorschlag von R&D – Bestätigung durch das LBC3 Rechts-Recherche-Team steht aus.
import { sb } from './_lib/common.mjs';

export const SPAM_TAGE = 30;
export const ERLEDIGT_TAGE = 365;
export const HOECHST_TAGE = 730;

export default async () => {
  const vor = (tage) => encodeURIComponent(new Date(Date.now() - tage * 24 * 3600 * 1000).toISOString());
  await sb(`/rest/v1/kontakt_anfragen?status=eq.spam&status_am=lt.${vor(SPAM_TAGE)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await sb(`/rest/v1/kontakt_anfragen?erledigt_am=lt.${vor(ERLEDIGT_TAGE)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await sb(`/rest/v1/kontakt_anfragen?erledigt_am=is.null&created_at=lt.${vor(HOECHST_TAGE)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return new Response('Anfragen aufgeräumt');
};

export const config = { schedule: '20 2 * * *' };
