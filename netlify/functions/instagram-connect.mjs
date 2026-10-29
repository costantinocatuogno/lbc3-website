// Team-Bereich: Instagram verbinden (Zugangsschlüssel speichern), Status anzeigen, trennen, Website neu bauen.
import { handle, json, requireAdmin, readBody, HttpError, triggerBuild } from './_lib/common.mjs';
import { getToken, saveToken, store, me, refresh } from './_lib/instagram.mjs';

export default handle(async (req) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const t = await getToken();
    if (!t) return json({ verbunden: false });
    return json({ verbunden: true, konto: t.username || '', gespeichert_am: t.gespeichert_am, gueltig_bis: t.gueltig_bis || null });
  }
  if (req.method === 'DELETE') {
    await store().delete('token');
    await store().delete('feed').catch(() => {});
    return json({ ok: true });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Nicht erlaubt.');
  const b = await readBody(req);
  if (b.aktion === 'neu-bauen') {
    const ok = await triggerBuild();
    if (!ok) throw new HttpError(503, 'Build-Hook fehlt (NETLIFY_BUILD_HOOK_URL).');
    return json({ ok: true });
  }
  const token = String(b.token || '').trim();
  if (token.length < 40) throw new HttpError(400, 'Das sieht nicht nach einem Instagram-Zugangsschlüssel aus.');
  let konto;
  try { konto = await me(token); } catch (e) { throw new HttpError(400, `Instagram lehnt den Schlüssel ab: ${e.message}`); }
  // Gleich verlängern (60 Tage gültig); klappt das nicht, den eingegebenen Schlüssel behalten
  let finalToken = token;
  let gueltigBis = null;
  try {
    const r = await refresh(token);
    if (r.access_token) { finalToken = r.access_token; gueltigBis = new Date(Date.now() + (Number(r.expires_in) || 5184000) * 1000).toISOString(); }
  } catch { /* frisch erzeugte Schlüssel können oft erst nach 24 Std. verlängert werden */ }
  await saveToken({ token: finalToken, username: konto.username, user_id: konto.user_id, gueltig_bis: gueltigBis });
  await store().delete('feed').catch(() => {});
  await triggerBuild().catch(() => {});
  return json({ ok: true, konto: konto.username });
});

export const config = { path: '/api/instagram-connect' };
