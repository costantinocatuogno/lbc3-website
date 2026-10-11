// Tägliche Mini-Abfrage an Supabase. Kostenlose Supabase-Projekte werden nach längerer Inaktivität pausiert –
// diese geplante Funktion hält die Datenbank wach, damit Sponsoren sich jederzeit anmelden können.
export default async () => {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return new Response('nicht konfiguriert');
  const res = await fetch(`${url}/rest/v1/bericht_saison?select=saison&limit=1`, { headers: String(key).startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` } }).catch(() => null);
  return new Response(`Supabase: ${res ? res.status : 'nicht erreichbar'}`);
};

export const config = { schedule: '@daily' };
