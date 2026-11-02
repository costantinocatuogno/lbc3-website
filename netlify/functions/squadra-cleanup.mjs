// Täglich (L4): Anmeldungen löschen, die nicht innerhalb von 7 Tagen bestätigt wurden – unter 16: ohne Zustimmung der
// Eltern – einschließlich Foto und Pin. Bei 16/17-Jährigen ohne Eltern-Zustimmung zum Foto wird nur das Foto gelöscht.
// Außerdem: alte Rate-Limit-Zähler aufräumen. Auswahl der Einträge: aufraeumPlan() in _lib/squadra-rules.mjs (getestet).
import { sb, sbRemove } from './_lib/common.mjs';
import { aufraeumPlan, TOKEN_TAGE } from './_lib/squadra-rules.mjs';
import { pinsEntfernen, limitsAufraeumen } from './_lib/squadra-store.mjs';

export async function aufraeumen(now = Date.now()) {
  // Nur Einträge, die älter als 7 Tage sind (neuere können noch gar nicht abgelaufen sein)
  const vor = new Date(now - TOKEN_TAGE * 24 * 3600 * 1000).toISOString();
  const rows = await sb(`/rest/v1/squadra_tre?select=*&created_at=lt.${encodeURIComponent(vor)}`);
  const plan = aufraeumPlan(rows, now);
  for (const z of plan.zeilen) {
    if (z.foto_pfad) await sbRemove('squadra', z.foto_pfad);
    await sb(`/rest/v1/squadra_tre?id=eq.${z.id}`, { method: 'DELETE' });
  }
  await pinsEntfernen(plan.zeilen.map((z) => z.id));
  for (const f of plan.fotos) {
    await sbRemove('squadra', f.foto_pfad);
    await sb(`/rest/v1/squadra_tre?id=eq.${f.id}`, { method: 'PATCH', body: { foto_pfad: null, foto_freigegeben: false } });
  }
  const limits = await limitsAufraeumen(now);
  return `Gelöscht: ${plan.zeilen.length} Anmeldungen, ${plan.fotos.length} Fotos, ${limits} alte Zähler`;
}

export default async () => {
  try {
    const info = await aufraeumen();
    console.log(info);
    return new Response(info);
  } catch (err) {
    console.error('Squadra-Aufräumen fehlgeschlagen:', err.message);
    return new Response(`Fehler: ${err.message}`, { status: 500 });
  }
};

// Täglich 03:17 UTC
export const config = { schedule: '17 3 * * *' };
