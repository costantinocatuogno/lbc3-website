// Admin lädt einen Sponsor oder Admin ein: Supabase verschickt die Einladung, wir legen das Profil mit Rolle an.
import { handle, json, sb, requireAdmin, siteUrl, readBody, HttpError } from './_lib/common.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  const me = await requireAdmin(req);
  const b = await readBody(req);
  const email = String(b.email || '').trim().toLowerCase();
  const firma = String(b.firma || '').trim().slice(0, 160);
  const rolle = b.rolle === 'admin' ? 'admin' : 'sponsor';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Bitte eine gültige E-Mail angeben.');

  if (email === String(me.email || '').toLowerCase()) throw new HttpError(400, 'Das ist deine eigene Adresse – dein Admin-Zugang bleibt unverändert. Für einen Test bitte eine andere Adresse verwenden (z. B. contact@).');

  const redirect = encodeURIComponent(`${siteUrl()}/login/`);
  let user;
  try {
    user = await sb(`/auth/v1/invite?redirect_to=${redirect}`, { method: 'POST', body: { email, data: { firma, rolle } } });
  } catch (err) {
    // Existiert schon? Dann nur Rolle setzen.
    const list = await sb(`/auth/v1/admin/users?per_page=1000`);
    user = (list.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (!user) throw err;
    // Bestehende Admins nie über eine Einladung herabstufen
    const prof = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=rolle`).catch(() => []);
    if (prof?.[0]?.rolle === 'admin' && rolle !== 'admin') {
      throw new HttpError(400, `${email} ist bereits Admin – die Rolle wurde nicht geändert.`);
    }
  }

  await sb('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    body: { id: user.id, email, firma, name: firma, rolle },
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
  });
  return json({ ok: true });
});

export const config = { path: '/api/team-invite' };
