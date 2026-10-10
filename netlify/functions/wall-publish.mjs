// Wall of Fame aktualisieren: löst einen neuen Build aus (nur Admins).
import { handle, json, requireAdmin, triggerBuild, HttpError } from './_lib/common.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  await requireAdmin(req);
  const ok = await triggerBuild();
  if (!ok) throw new HttpError(503, 'Build-Hook fehlt (NETLIFY_BUILD_HOOK_URL) oder hat nicht geantwortet.');
  return json({ ok: true });
});

export const config = { path: '/api/wall-publish' };
