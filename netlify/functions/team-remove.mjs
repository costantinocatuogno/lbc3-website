// Admin entfernt einen Zugang vollständig (Login und Profil).
import { handle, json, sb, requireAdmin, readBody, HttpError } from './_lib/common.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  const me = await requireAdmin(req);
  const { id } = await readBody(req);
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) throw new HttpError(400, 'Ungültige ID.');
  if (id === me.id) throw new HttpError(400, 'Du kannst dich nicht selbst entfernen.');
  await sb(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }); // Profil wird per "on delete cascade" mitgelöscht
  return json({ ok: true });
});

export const config = { path: '/api/team-remove' };
