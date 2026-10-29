// Läuft täglich: verlängert den Instagram-Schlüssel rechtzeitig (gilt 60 Tage) und baut die Website neu,
// wenn es einen neuen Beitrag gibt – so erscheinen neue Posts innerhalb eines Tages auf der Website.
import { getToken, saveToken, refresh, media, store } from './_lib/instagram.mjs';
import { triggerBuild } from './_lib/common.mjs';

export default async () => {
  const t = await getToken();
  if (!t) return;
  const alter = Date.now() - new Date(t.gespeichert_am || 0).getTime();
  if (alter > 7 * 24 * 60 * 60 * 1000) {
    try {
      const r = await refresh(t.token);
      if (r.access_token) await saveToken({ ...t, token: r.access_token, gueltig_bis: new Date(Date.now() + (Number(r.expires_in) || 5184000) * 1000).toISOString() });
    } catch (e) { console.error('Instagram-Schlüssel nicht verlängert:', e.message); }
  }
  try {
    const latest = (await media((await getToken()).token, 1))[0];
    const last = await store().get('letzter_beitrag');
    if (latest && latest.id !== last) {
      await store().set('letzter_beitrag', latest.id);
      await store().delete('feed').catch(() => {});
      await triggerBuild();
    }
  } catch (e) { console.error('Instagram-Prüfung:', e.message); }
};

export const config = { schedule: '@daily' };
