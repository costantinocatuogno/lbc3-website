// Admin lädt einen Partner oder Admin ein. Supabase erzeugt den Einladungslink, wir schicken die Einladung
// in der Sprache des Partners (über Brevo) und legen das Profil mit Rolle und Sprache an.
import { handle, json, sb, requireAdmin, siteUrl, readBody, HttpError, sendMail, mailLayout, escapeHtml } from './_lib/common.mjs';
import { INVITE, pickLang, langPrefix } from './_lib/texte.mjs';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Nur POST.');
  const me = await requireAdmin(req);
  const b = await readBody(req);
  const email = String(b.email || '').trim().toLowerCase();
  const firma = String(b.firma || '').trim().slice(0, 160);
  const rolle = b.rolle === 'admin' ? 'admin' : 'sponsor';
  const sprache = pickLang(b.sprache);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Bitte eine gültige E-Mail angeben.');

  if (email === String(me.email || '').toLowerCase()) throw new HttpError(400, 'Das ist deine eigene Adresse – dein Admin-Zugang bleibt unverändert. Für einen Test bitte eine andere Adresse verwenden (z. B. contact@).');

  const redirectTo = `${siteUrl()}${langPrefix(sprache)}/login/`;
  let user;
  let link = null;
  try {
    const res = await sb('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'invite', email, data: { firma, rolle, sprache }, redirect_to: redirectTo } });
    link = res.action_link || res.properties?.action_link || null;
    user = res.user || res;
  } catch (err) {
    // Existiert schon? Dann nur Rolle und Sprache setzen.
    const list = await sb(`/auth/v1/admin/users?per_page=1000`);
    user = (list.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (!user) throw err;
    // Bestehende Admins nie über eine Einladung herabstufen
    const prof = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=rolle`).catch(() => []);
    if (prof?.[0]?.rolle === 'admin' && rolle !== 'admin') {
      throw new HttpError(400, `${email} ist bereits Admin – die Rolle wurde nicht geändert.`);
    }
  }
  if (!user?.id) throw new HttpError(502, 'Einladung konnte nicht erstellt werden.');

  const upsert = (body) => sb('/rest/v1/profiles?on_conflict=id', { method: 'POST', body, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  try { await upsert({ id: user.id, email, firma, name: firma, rolle, sprache }); }
  catch { await upsert({ id: user.id, email, firma, name: firma, rolle }); } // Spalte „sprache“ noch nicht angelegt (Migration 003)

  if (link) {
    const T = INVITE[sprache];
    await sendMail({
      to: { email },
      subject: T.subject,
      html: mailLayout(T.title, `<p>Ciao${firma ? ' ' + escapeHtml(firma) : ''},</p><p>${rolle === 'admin' ? T.adminBody : T.body(escapeHtml(firma))}</p>
        <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#B00E28;color:#ffffff;padding:14px 22px;border-radius:4px;text-decoration:none;font-weight:bold">${T.btn}</a></p>
        <p style="color:#555A63;font-size:13px">${T.note}</p>`)
    });
  }
  return json({ ok: true, eingeladen: !!link, sprache });
});

export const config = { path: '/api/team-invite' };
