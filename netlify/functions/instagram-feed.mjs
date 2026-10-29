// Liefert die neuesten Instagram-Beiträge für den Website-Build (öffentlich, nur öffentliche Beiträge, ohne Schlüssel).
// Ergebnis wird eine Stunde zwischengespeichert, damit Instagram nicht bei jedem Aufruf gefragt wird.
import { json, handle } from './_lib/common.mjs';
import { getToken, media, store } from './_lib/instagram.mjs';

export default handle(async () => {
  const cached = await store().get('feed', { type: 'json' });
  if (cached && Date.now() - new Date(cached.stand).getTime() < 60 * 60 * 1000) return json(cached);
  const t = await getToken();
  if (!t) return json({ verbunden: false, beitraege: [] });
  try {
    const beitraege = await media(t.token, 12);
    const out = { verbunden: true, konto: t.username, stand: new Date().toISOString(), beitraege };
    await store().setJSON('feed', out);
    return json(out);
  } catch (e) {
    console.error('Instagram-Feed:', e.message);
    return json(cached || { verbunden: true, fehler: true, beitraege: [] });
  }
});

export const config = { path: '/api/instagram-feed' };
