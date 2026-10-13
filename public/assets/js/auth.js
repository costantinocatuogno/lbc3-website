/* LBC3 – Login, Ausgabenbericht (Partner) und Team-Bereich (Admins).
   Alle vertraulichen Daten kommen erst nach dem Login aus Supabase.
   Zugriffsrechte werden in der Datenbank per Row-Level-Security durchgesetzt. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const cfg = window.LBC3_CONFIG || {};
  const eur = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const num = (n) => new Intl.NumberFormat('de-DE').format(Number(n) || 0);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showMsg(text, isError = false) {
    const el = $('[data-msg]');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', isError);
    el.hidden = false;
    if (!isError) setTimeout(() => { el.hidden = true; }, 5000);
  }

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase || window.__supabaseMissing) {
    const loading = $('[data-loading]');
    if (loading) loading.hidden = true;
    showMsg('Der Login ist noch nicht eingerichtet (Supabase-Zugangsdaten fehlen). Siehe README, Abschnitt „Supabase“.', true);
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
  });

  async function getProfile() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    // Wer angemeldet ist (Team/Partner), sieht im Bald-Modus immer die echte Website
    try { document.cookie = 'lbc3_vorschau=1; Max-Age=' + (60 * 60 * 24 * 365) + '; Path=/; Secure; SameSite=Lax'; } catch (e) { /* egal */ }
    const { data, error } = await sb.from('profiles').select('id, rolle, name, firma, email').eq('id', session.user.id).maybeSingle();
    if (error) throw error;
    return data ? { ...data, session } : { rolle: null, session };
  }

  $$('[data-logout]').forEach((b) => b.addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/login/'; }));

  /* ======================= LOGIN ======================= */
  const loginForm = $('[data-login-form]');
  if (loginForm) {
    let role = 'sponsor';
    const hint = $('[data-role-hint]');
    $$('[data-role-tab]').forEach((tab) => tab.addEventListener('click', () => {
      role = tab.dataset.roleTab;
      $$('[data-role-tab]').forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      hint.textContent = role === 'sponsor'
        ? 'Als Partner siehst du hier jederzeit unseren aktuellen Ausgabenbericht.'
        : 'Für das Team: Ausgabenbericht pflegen, Zugänge verwalten, Squadra Tre. Fotos und Texte im CMS.';
    }));

    const goToArea = async () => {
      const p = await getProfile();
      if (!p) return;
      if (p.rolle === 'admin') location.href = role === 'sponsor' ? '/bericht/' : '/team/';
      else if (p.rolle === 'sponsor') location.href = '/bericht/';
      else { showMsg('Dein Konto hat noch keine Freigabe. Bitte melde dich bei uns.', true); await sb.auth.signOut(); }
    };

    const setPwForm = $('[data-setpw-form]');
    const hash = new URLSearchParams(location.hash.slice(1));
    const isInviteOrReset = ['invite', 'recovery'].includes(hash.get('type'));

    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { loginForm.hidden = true; setPwForm.hidden = false; }
    });

    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session && isInviteOrReset) { loginForm.hidden = true; setPwForm.hidden = false; return; }
      if (session) goToArea();
    })();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if (!password) { showMsg('Bitte Passwort eingeben – oder „Login-Link per E-Mail“ nutzen.', true); return; }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        const m = String(error.message || '');
        const hint = /confirm/i.test(m) ? 'Die E-Mail-Adresse ist noch nicht bestätigt (in Supabase „Auto Confirm User“ anhaken oder Einladungslink öffnen).'
          : /invalid login|credentials/i.test(m) ? 'E-Mail oder Passwort stimmen nicht.'
          : /api key|apikey|jwt|unauthorized|fetch/i.test(m) ? 'Verbindung zu Supabase fehlgeschlagen – bitte SUPABASE_URL und SUPABASE_ANON_KEY in Netlify prüfen.'
          : 'Bitte E-Mail und Passwort prüfen.';
        showMsg(`Anmeldung fehlgeschlagen. ${hint} (Technische Meldung: ${m || error.status || 'unbekannt'})`, true);
        return;
      }
      goToArea();
    });

    $('[data-magic]').addEventListener('click', async () => {
      const email = loginForm.email.value.trim();
      if (!email) { showMsg('Bitte zuerst die E-Mail-Adresse eingeben.', true); return; }
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/login/` } });
      showMsg(error ? 'Login-Link konnte nicht gesendet werden.' : 'Falls ein Zugang existiert, ist der Login-Link unterwegs. Bitte Postfach prüfen.', !!error);
    });

    $('[data-reset]').addEventListener('click', async () => {
      const email = loginForm.email.value.trim();
      if (!email) { showMsg('Bitte zuerst die E-Mail-Adresse eingeben.', true); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login/` });
      showMsg(error ? 'E-Mail konnte nicht gesendet werden.' : 'Falls ein Zugang existiert, haben wir dir einen Link zum Zurücksetzen geschickt.', !!error);
    });

    setPwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.updateUser({ password: setPwForm.password.value });
      if (error) { showMsg('Passwort konnte nicht gespeichert werden: ' + error.message, true); return; }
      history.replaceState(null, '', '/login/');
      showMsg('Passwort gespeichert – du wirst weitergeleitet …');
      setTimeout(goToArea, 800);
    });
  }

  async function guard(allowed) {
    const p = await getProfile().catch(() => null);
    if (!p || !allowed.includes(p.rolle)) { location.replace('/login/'); return null; }
    const label = $('[data-user-label]');
    if (label) label.textContent = `Angemeldet als ${p.firma || p.name || p.email || p.session.user.email} · ${p.rolle === 'admin' ? 'Admin' : 'Partner'}`;
    return p;
  }


  /* ======================= WALL OF FAME: gemeinsame Helfer ======================= */
  const SOCIAL = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
  const SOCIAL_BASE = { instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/@', youtube: 'https://youtube.com/@', facebook: 'https://facebook.com/', linkedin: 'https://linkedin.com/company/' };
  const normUrl = (k, v) => {
    v = String(v || '').trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return 'https://' + v;
    return SOCIAL_BASE[k] ? SOCIAL_BASE[k] + v.replace(/^@/, '') : null;
  };
  const signed = async (bucket, path) => {
    if (!path) return null;
    const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
    return data ? data.signedUrl : null;
  };
  const resizeImage = (file, max = 1200, type = 'image/jpeg') => new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') { resolve(file); return; }
    const im = new Image();
    im.onerror = reject;
    im.onload = () => {
      const scale = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
      const g = c.getContext('2d');
      if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(im, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild'))), type, 0.86);
    };
    im.src = URL.createObjectURL(file);
  });
  const previewInto = (el, blob) => { el.innerHTML = ''; const i = document.createElement('img'); i.alt = ''; i.src = URL.createObjectURL(blob); el.appendChild(i); };

  // Partner-Formular (Login des Sponsors und Team-Bereich nutzen dasselbe Formular)
  function bindSponsorForm(form, { userId = null, onSaved }) {
    let logoBlob = null;
    const preview = $('[data-sw-preview]', form);
    $('[data-sw-logo]', form).addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { showMsg('Logo ist zu groß (max. 5 MB).', true); return; }
      logoBlob = await resizeImage(f, 1200, 'image/png');
      previewInto(preview, logoBlob);
    });
    const fill = async (row) => {
      form.reset(); logoBlob = null; preview.textContent = 'Logo';
      if (!row) return;
      ['id', 'firma', 'ansprechpartner', 'website', 'text', 'paket', ...SOCIAL].forEach((k) => { if (form[k]) form[k].value = row[k] || ''; });
      form.einwilligung.checked = true;
      const u = await signed('sponsoren', row.logo_pfad);
      if (u) { preview.innerHTML = `<img src="${escapeHtml(u)}" alt="">`; }
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const row = {
        firma: form.firma.value.trim(), ansprechpartner: form.ansprechpartner.value.trim() || null,
        website: normUrl('web', form.website.value), text: form.text.value.trim() || null
      };
      if (form.paket) row.paket = form.paket.value.trim() || null;
      SOCIAL.forEach((k) => { row[k] = normUrl(k, form[k].value); });
      if (!row.website) { showMsg('Bitte eine gültige Website angeben (https://…).', true); return; }
      if (!SOCIAL.some((k) => row[k])) { showMsg('Bitte mindestens einen Social-Media-Kanal angeben.', true); return; }
      try {
        let id = form.id.value || null;
        if (userId) row.user_id = userId;
        const q = id ? sb.from('sponsor_wall').update(row).eq('id', id) : sb.from('sponsor_wall').insert(row);
        const { data, error } = await q.select().single();
        if (error) throw error;
        id = data.id;
        if (logoBlob) {
          const ext = logoBlob.type === 'image/svg+xml' ? 'svg' : 'png';
          const folder = data.user_id || 'team';
          const path = `${folder}/${id}-logo.${ext}`;
          const { error: upErr } = await sb.storage.from('sponsoren').upload(path, logoBlob, { upsert: true, contentType: logoBlob.type });
          if (upErr) throw upErr;
          const { error: e2 } = await sb.from('sponsor_wall').update({ logo_pfad: path }).eq('id', id);
          if (e2) throw e2;
        }
        const { data: fresh } = await sb.from('sponsor_wall').select('*').eq('id', id).single();
        await fill(fresh);
        onSaved && onSaved(fresh);
      } catch (err) { showMsg('Speichern fehlgeschlagen: ' + err.message, true); }
    });
    return { fill };
  }

  /* ======================= AUSGABENBERICHT ======================= */
  const berichtRoot = $('[data-bericht]');
  if (berichtRoot) {
    (async () => {
      const p = await guard(['sponsor', 'admin']);
      if (!p) return;
      // Eigener Wall-of-Fame-Eintrag (nur Partner)
      const own = $('[data-sw-own]');
      if (own && p.rolle === 'sponsor') {
        own.hidden = false;
        const status = $('[data-sw-status]');
        const setStatus = (r) => {
          status.textContent = !r ? 'Noch kein Eintrag' : r.freigegeben ? 'Online auf der Website' : 'Wartet auf Freigabe';
          status.classList.toggle('ok', !!(r && r.freigegeben));
        };
        const ctl = bindSponsorForm($('[data-sw-form]', own), { userId: p.id, onSaved: (r) => { setStatus(r); showMsg('Gespeichert – wir prüfen den Eintrag und schalten ihn frei.'); } });
        const { data: mine } = await sb.from('sponsor_wall').select('*').eq('user_id', p.id).maybeSingle();
        if (mine) await ctl.fill(mine);
        else { const f = $('[data-sw-form]', own); f.firma.value = p.firma || ''; f.ansprechpartner.value = p.name || ''; }
        setStatus(mine);
      }
      const { data: seasons, error } = await sb.from('bericht_saison').select('*').order('saison', { ascending: false });
      $('[data-loading]').hidden = true;
      if (error) { showMsg('Bericht konnte nicht geladen werden.', true); return; }
      if (!seasons.length) { showMsg('Es ist noch kein Bericht freigegeben. Wir melden uns, sobald es so weit ist.'); return; }
      const select = $('[data-season-select]');
      select.innerHTML = seasons.map((s) => `<option value="${s.saison}">${s.saison}${s.status !== 'freigegeben' ? ' (Entwurf – nur Admins)' : ''}</option>`).join('');
      const render = async (saison) => {
        const s = seasons.find((x) => String(x.saison) === String(saison));
        const { data: rows } = await sb.from('ausgaben').select('kategorie, betrag').eq('saison', s.saison).order('id');
        const total = (rows || []).reduce((a, r) => a + Number(r.betrag || 0), 0);
        $('[data-year]').textContent = s.saison;
        $('[data-status]').textContent = s.status === 'freigegeben'
          ? `Freigegeben${s.freigegeben_am ? ' am ' + new Date(s.freigegeben_am).toLocaleDateString('de-DE') : ''} · Stand ${new Date(s.updated_at).toLocaleDateString('de-DE')}`
          : 'Entwurf – nur für Admins sichtbar';
        $('[data-k="gesamt"]').textContent = eur(total);
        $('[data-k="partner"]').textContent = eur(Number(s.fin_sponsoren || 0) + Number(s.fin_squadra || 0));
        $('[data-k="rennwochenenden"]').textContent = num(s.rennwochenenden);
        $('[data-k="kilometer"]').textContent = `${num(s.kilometer)} km`;
        $('[data-rows]').innerHTML = (rows || []).map((r) => `<tr><td>${escapeHtml(r.kategorie)}</td><td class="num strong">${eur(r.betrag)}</td><td class="num muted">${total ? Math.round((Number(r.betrag) / total) * 100) : 0} %</td></tr>`).join('')
          + `<tr><td class="strong">Gesamt</td><td class="num strong red">${eur(total)}</td><td class="num strong">100 %</td></tr>`;
        $('[data-finanzierung]').innerHTML = [
          ['Partner (Pakete)', s.fin_sponsoren], ['Squadra Tre (Unterstützer)', s.fin_squadra], ['Eigenmittel Familie', s.fin_eigen], ['Sonstiges (z. B. Förderungen)', s.fin_sonstiges]
        ].map(([k, v]) => `<div><dt>${k}</dt><dd>${eur(v)}</dd></div>`).join('');
        $('[data-rueckblick]').innerHTML = escapeHtml(s.rueckblick || '–').replace(/\n/g, '<br>');
        const dl = $('[data-downloads]');
        const files = [['Jahresbericht ' + s.saison + ' (PDF)', s.pdf_bericht], ['Belegübersicht ' + s.saison + ' (PDF)', s.pdf_belege]].filter(([, f]) => f);
        dl.innerHTML = files.length ? files.map(([label, f]) => `<a href="#" data-file="${escapeHtml(f)}"><span>${label}</span><span class="muted small">Herunterladen</span></a>`).join('') : '<p class="muted">Noch keine Dateien hochgeladen.</p>';
        $$('[data-file]', dl).forEach((a) => a.addEventListener('click', async (e) => {
          e.preventDefault();
          const { data, error: err } = await sb.storage.from('berichte').createSignedUrl(a.dataset.file, 120);
          if (err) { showMsg('Datei konnte nicht geöffnet werden.', true); return; }
          window.open(data.signedUrl, '_blank', 'noopener');
        }));
      };
      select.addEventListener('change', () => render(select.value));
      await render(seasons[0].saison);
      $('[data-content]').hidden = false;
    })();
  }

  /* ======================= TEAM-BEREICH ======================= */
  const team = $('[data-team]');
  if (team) {
    (async () => {
      const p = await guard(['admin']);
      if (!p) return;
      $('[data-loading]').hidden = true;
      const token = () => p.session.access_token;
      const api = async (path, body) => {
        const { data: { session } } = await sb.auth.getSession();
        const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session ? session.access_token : token()}` }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `Fehler ${res.status}`);
        return json;
      };

      // Tabs
      const tabs = $$('[data-tab]');
      const showTab = (name) => {
        tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
        $$('[data-panel]').forEach((pnl) => { pnl.hidden = pnl.dataset.panel !== name; });
        if (name === 'zugaenge') loadProfiles();
        if (name === 'squadra') loadSquadra();
        if (name === 'sponsorwall') loadSponsorWall();
        if (name === 'einladen') renderInvite();
      };
      tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

      /* ----- Ausgabenbericht ----- */
      const saisonInput = $('[data-saison]');
      saisonInput.value = new Date().getFullYear();
      let current = null;
      const fields = $$('[data-f]');
      const ausgabeInputs = $$('[data-ausgabe]');
      const updateSum = () => { $('[data-summe]').textContent = eur(ausgabeInputs.reduce((a, i) => a + (Number(i.value) || 0), 0)); };
      ausgabeInputs.forEach((i) => i.addEventListener('input', updateSum));

      const renderStatus = () => {
        const released = current && current.status === 'freigegeben';
        const badge = $('[data-status-badge]');
        badge.textContent = released ? 'Für Partner sichtbar' : 'Entwurf – nur Admins';
        badge.classList.toggle('ok', released);
        $('[data-toggle-release]').textContent = released ? 'Freigabe zurückziehen' : 'Für Partner freigeben';
        $('[data-mail-info]').textContent = current && current.mail_versendet_am ? `Jahresbericht an Squadra Tre gesendet am ${new Date(current.mail_versendet_am).toLocaleString('de-DE')}.` : '';
        ['pdf_bericht', 'pdf_belege'].forEach((k) => { $(`[data-pdf-name="${k}"]`).textContent = current && current[k] ? `Hochgeladen: ${current[k]}` : ''; });
      };

      const loadSeason = async () => {
        const saison = Number(saisonInput.value);
        const { data: s } = await sb.from('bericht_saison').select('*').eq('saison', saison).maybeSingle();
        const { data: rows } = await sb.from('ausgaben').select('kategorie, betrag').eq('saison', saison);
        current = s || { saison, status: 'entwurf' };
        fields.forEach((f) => { f.value = current[f.dataset.f] ?? ''; });
        ausgabeInputs.forEach((i) => { const r = (rows || []).find((x) => x.kategorie === i.dataset.ausgabe); i.value = r ? r.betrag : ''; });
        updateSum();
        renderStatus();
      };
      saisonInput.addEventListener('change', loadSeason);

      const save = async (extra = {}) => {
        const saison = Number(saisonInput.value);
        const row = { saison, ...extra };
        fields.forEach((f) => {
          const v = f.value;
          row[f.dataset.f] = f.tagName === 'TEXTAREA' ? v : (v === '' ? null : Number(v));
        });
        row.status = extra.status || current.status || 'entwurf';
        const { data, error } = await sb.from('bericht_saison').upsert(row, { onConflict: 'saison' }).select().single();
        if (error) throw error;
        const ausg = ausgabeInputs.map((i) => ({ saison, kategorie: i.dataset.ausgabe, betrag: Number(i.value) || 0 }));
        const { error: e2 } = await sb.from('ausgaben').upsert(ausg, { onConflict: 'saison,kategorie' });
        if (e2) throw e2;
        current = data;
        renderStatus();
      };

      $('[data-save]').addEventListener('click', async () => {
        try { await save(); showMsg('Gespeichert.'); } catch (e) { showMsg('Speichern fehlgeschlagen: ' + e.message, true); }
      });
      $('[data-toggle-release]').addEventListener('click', async () => {
        const release = current.status !== 'freigegeben';
        try {
          await save(release ? { status: 'freigegeben', freigegeben_am: new Date().toISOString() } : { status: 'entwurf' });
          showMsg(release ? 'Bericht ist jetzt für Partner sichtbar.' : 'Freigabe zurückgezogen.');
        } catch (e) { showMsg('Fehler: ' + e.message, true); }
      });
      $$('[data-pdf]').forEach((input) => input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        const saison = Number(saisonInput.value);
        const path = `${saison}/${input.dataset.pdf === 'pdf_bericht' ? 'jahresbericht' : 'belege'}-${saison}.pdf`;
        const { error } = await sb.storage.from('berichte').upload(path, file, { upsert: true, contentType: 'application/pdf' });
        if (error) { showMsg('Upload fehlgeschlagen: ' + error.message, true); return; }
        try { await save({ [input.dataset.pdf]: path }); showMsg('PDF hochgeladen.'); } catch (e) { showMsg('Fehler: ' + e.message, true); }
      }));
      $('[data-send-report]').addEventListener('click', async () => {
        if (!current || current.status !== 'freigegeben') { showMsg('Bitte den Bericht zuerst speichern und freigeben.', true); return; }
        if (!confirm(`Jahresbericht ${saisonInput.value} jetzt an alle bestätigten Squadra-3-Mitglieder mit Häkchen „Jahresbericht“ senden?`)) return;
        try {
          const r = await api('/api/report-send', { saison: Number(saisonInput.value) });
          showMsg(`Jahresbericht an ${r.gesendet} Mitglieder gesendet.`);
          await loadSeason();
        } catch (e) { showMsg('Versand fehlgeschlagen: ' + e.message, true); }
      });

      /* ----- Zugänge ----- */
      async function loadProfiles() {
        const { data, error } = await sb.from('profiles').select('id, email, name, firma, rolle').order('rolle').order('firma');
        if (error) { showMsg('Zugänge konnten nicht geladen werden.', true); return; }
        $('[data-profiles]').innerHTML = data.map((r) => `<tr><td>${escapeHtml(r.firma || r.name || '')}</td><td>${escapeHtml(r.email || '')}</td><td>${r.rolle === 'admin' ? '<strong>Admin</strong>' : 'Partner'}</td><td class="actions">${r.id === p.id ? '' : `<button class="small-btn" data-remove="${r.id}">Zugang entfernen</button>`}</td></tr>`).join('');
        $$('[data-remove]').forEach((b) => b.addEventListener('click', async () => {
          if (!confirm('Diesen Zugang wirklich entfernen? Die Person kann sich danach nicht mehr anmelden.')) return;
          try { await api('/api/team-remove', { id: b.dataset.remove }); showMsg('Zugang entfernt.'); loadProfiles(); } catch (e) { showMsg(e.message, true); }
        }));
      }
      $('[data-invite-form]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          await api('/api/team-invite', { email: f.email.value.trim(), firma: f.firma.value.trim(), rolle: f.rolle.value });
          showMsg('Einladung gesendet.'); f.reset(); loadProfiles();
        } catch (err) { showMsg('Einladung fehlgeschlagen: ' + err.message, true); }
      });

      /* ----- Squadra Tre ----- */
      let squadra = [];
      let sFilter = 'alle';
      const kurzName = (n) => { const p2 = String(n || '').trim().split(/\s+/); return p2.length > 1 ? `${p2[0]} ${p2[p2.length - 1][0].toUpperCase()}.` : (p2[0] || ''); };
      const initialsOf = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();
      const zoom = (src) => { const d = document.createElement('div'); d.className = 'photo-zoom'; d.innerHTML = `<img src="${escapeHtml(src)}" alt="">`; d.addEventListener('click', () => d.remove()); document.body.appendChild(d); };

      const renderSquadra = async () => {
        const q = ($('[data-ssearch]').value || '').toLowerCase();
        const list = squadra.filter((r) => {
          if (sFilter === 'pruefen' && !(r.foto_pfad && !r.foto_freigegeben)) return false;
          if (sFilter === 'freund' && r.mitgliedschaft !== 'freund') return false;
          if (sFilter === 'unterstuetzer' && r.mitgliedschaft !== 'unterstuetzer') return false;
          if (sFilter === 'offen' && r.optin_bestaetigt) return false;
          return !q || [r.name, r.email, r.instagram, r.angezeigter_name].some((v) => String(v || '').toLowerCase().includes(q));
        });
        const box = $('[data-squadra]');
        if (!list.length) { box.innerHTML = '<p class="muted">Keine Einträge.</p>'; return; }
        box.innerHTML = list.map((r) => {
          const pending = r.foto_pfad && !r.foto_freigegeben;
          const tags = [
            r.mitgliedschaft === 'unterstuetzer' ? `<span class="t-warn">Unterstützer${r.betrag ? ' · ' + eur(r.betrag) : ''}</span>` : '<span>Freund/Fan</span>',
            r.optin_bestaetigt ? '<span class="t-ok">bestätigt</span>' : '<span class="t-red">unbestätigt</span>',
            r.minderjaehrig ? `<span class="t-warn">unter 16${r.einwilligung_eltern ? ' · Eltern: ' + escapeHtml(r.einwilligung_eltern) : ''}</span>` : '',
            r.wand_optin ? '<span>Wall ✓</span>' : '<span>keine Wall</span>',
            r.updates_optin ? '<span>Updates</span>' : '', r.jahresbericht_optin ? '<span>Jahresbericht</span>' : '',
            r.quelle === 'admin' ? '<span>vom Team</span>' : '', r.ausgeblendet ? '<span class="t-red">ausgeblendet</span>' : ''
          ].join('');
          return `<article class="member${pending ? ' is-pending' : ''}${r.ausgeblendet ? ' is-hidden' : ''}" data-id="${r.id}">
            <div class="member-top">
              <div class="member-photo" data-photo="${escapeHtml(r.foto_pfad || '')}">${escapeHtml(initialsOf(r.name))}</div>
              <div><div class="member-name">${escapeHtml(r.name)}</div>
                <div class="member-meta">${escapeHtml(r.email || '–')}${r.instagram ? ` · <a href="https://instagram.com/${encodeURIComponent(r.instagram)}" target="_blank" rel="noopener">@${escapeHtml(r.instagram)}</a>` : ''}<br>${new Date(r.created_at).toLocaleDateString('de-DE')}</div></div>
            </div>
            <div class="tags">${tags}</div>
            <label class="field"><span>Name auf der Wall</span><input value="${escapeHtml(r.angezeigter_name || kurzName(r.name))}" data-dname maxlength="60"></label>
            <div class="member-actions">
              ${r.foto_pfad ? `<button class="small-btn" data-act="foto">${r.foto_freigegeben ? 'Foto sperren' : '✓ Foto freigeben'}</button>` : ''}
              <button class="small-btn" data-act="name">Name speichern</button>
              <button class="small-btn" data-act="hide">${r.ausgeblendet ? 'Wieder zeigen' : 'Ausblenden'}</button>
              <button class="small-btn" data-act="del">Löschen</button>
            </div>
          </article>`;
        }).join('');
        // Fotos über kurzlebige, signierte Links laden (Bucket ist privat)
        await Promise.all($$('[data-photo]', box).filter((el) => el.dataset.photo).map(async (el) => {
          const u = await signed('squadra', el.dataset.photo);
          if (u) { el.innerHTML = `<img src="${escapeHtml(u)}" alt="Foto">`; el.firstChild.addEventListener('click', () => zoom(u)); }
        }));
      };

      async function loadSquadra() {
        const { data, error } = await sb.from('squadra_tre').select('*').order('created_at', { ascending: false });
        if (error) { showMsg('Liste konnte nicht geladen werden.', true); return; }
        squadra = data;
        const ok = data.filter((r) => r.optin_bestaetigt);
        $('[data-sk="gesamt"]').textContent = ok.length;
        $('[data-sk="freund"]').textContent = ok.filter((r) => r.mitgliedschaft !== 'unterstuetzer').length;
        $('[data-sk="unterstuetzer"]').textContent = ok.filter((r) => r.mitgliedschaft === 'unterstuetzer').length;
        $('[data-sk="pruefen"]').textContent = data.filter((r) => r.foto_pfad && !r.foto_freigegeben).length;
        $('[data-updates-count]').textContent = ok.filter((r) => r.updates_optin && r.email).length;
        await renderSquadra();
      }
      $$('[data-sfilter] [data-f]').forEach((b) => b.addEventListener('click', () => {
        sFilter = b.dataset.f;
        $$('[data-sfilter] [data-f]').forEach((x) => x.classList.toggle('is-active', x === b));
        renderSquadra();
      }));
      $('[data-ssearch]').addEventListener('input', renderSquadra);
      $('[data-squadra]').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const card = btn.closest('[data-id]');
        const id = card.dataset.id;
        const r = squadra.find((x) => x.id === id);
        let patch = null;
        if (btn.dataset.act === 'foto') patch = { foto_freigegeben: !r.foto_freigegeben };
        if (btn.dataset.act === 'name') patch = { angezeigter_name: $('[data-dname]', card).value.trim() || kurzName(r.name) };
        if (btn.dataset.act === 'hide') patch = { ausgeblendet: !r.ausgeblendet };
        if (btn.dataset.act === 'del') {
          if (!confirm(`${r.name} endgültig löschen (z. B. auf Wunsch der Person oder der Eltern)? Das Foto wird ebenfalls gelöscht.`)) return;
          if (r.foto_pfad) await sb.storage.from('squadra').remove([r.foto_pfad]);
          const { error } = await sb.from('squadra_tre').delete().eq('id', id);
          if (error) showMsg('Löschen fehlgeschlagen.', true); else { showMsg('Gelöscht. Mit „Wall of Fame veröffentlichen“ verschwindet der Eintrag auch von der Website.'); loadSquadra(); }
          return;
        }
        const { error } = await sb.from('squadra_tre').update(patch).eq('id', id);
        if (error) { showMsg('Fehler: ' + error.message, true); return; }
        showMsg('Gespeichert. Mit „Wall of Fame veröffentlichen“ geht es online.');
        loadSquadra();
      });

      // Freund manuell hinzufügen
      let afBlob = null;
      $('[data-af-photo]').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        afBlob = await resizeImage(f);
        previewInto($('[data-af-preview]'), afBlob);
      });
      $('[data-add-friend]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (!f.reportValidity()) return;
        const row = {
          name: f.name.value.trim(), angezeigter_name: f.angezeigter_name.value.trim() || kurzName(f.name.value),
          instagram: f.instagram.value.trim().replace(/^@/, '') || null, email: f.email.value.trim().toLowerCase() || null,
          minderjaehrig: f.minderjaehrig.checked, mitgliedschaft: 'freund', quelle: 'admin',
          wand_optin: true, optin_bestaetigt: true, bestaetigt_am: new Date().toISOString(),
          jahresbericht_optin: false, updates_optin: false
        };
        try {
          const { data, error } = await sb.from('squadra_tre').insert(row).select('id').single();
          if (error) throw error;
          if (afBlob) {
            const path = `${data.id}.jpg`;
            const { error: upErr } = await sb.storage.from('squadra').upload(path, afBlob, { upsert: true, contentType: 'image/jpeg' });
            if (upErr) throw upErr;
            await sb.from('squadra_tre').update({ foto_pfad: path, foto_freigegeben: true }).eq('id', data.id);
          }
          f.reset(); afBlob = null; $('[data-af-preview]').textContent = 'Foto';
          showMsg('Hinzugefügt. Mit „Wall of Fame veröffentlichen“ erscheint der Eintrag online.');
          loadSquadra();
        } catch (err) { showMsg('Hinzufügen fehlgeschlagen: ' + err.message, true); }
      });

      // Nachricht an alle
      const msgForm = $('[data-message-form]');
      const sendMessage = async (test) => {
        if (!msgForm.reportValidity()) return;
        const n = $('[data-updates-count]').textContent;
        if (!test && !confirm(`Nachricht jetzt an ${n} Mitglieder senden?`)) return;
        try {
          const r = await api('/api/squadra-message', { betreff: msgForm.betreff.value, text: msgForm.text.value, test });
          showMsg(test ? 'Testmail gesendet.' : `Nachricht an ${r.gesendet} Mitglieder gesendet.`);
          if (!test) msgForm.reset();
        } catch (err) { showMsg('Versand fehlgeschlagen: ' + err.message, true); }
      };
      msgForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(false); });
      $('[data-msg-test]').addEventListener('click', () => sendMessage(true));

      // Veröffentlichen (Website neu bauen)
      $$('[data-publish]').forEach((b) => b.addEventListener('click', async () => {
        try { await api('/api/wall-publish', {}); showMsg('Wird veröffentlicht – in ca. 1–2 Minuten ist die Wall of Fame aktuell.'); }
        catch (err) { showMsg('Veröffentlichen fehlgeschlagen: ' + err.message, true); }
      }));

      $('[data-export]').addEventListener('click', () => {
        const head = ['Name', 'Name auf Wall', 'E-Mail', 'Instagram', 'Mitgliedschaft', 'Art', 'Betrag', 'Bestätigt', 'Unter 16', 'Eltern-E-Mail', 'Updates', 'Jahresbericht', 'Wall', 'Foto freigegeben', 'Quelle', 'Angemeldet am'];
        const yn = (b) => (b ? 'ja' : 'nein');
        const lines = squadra.map((r) => [r.name, r.angezeigter_name, r.email, r.instagram, r.mitgliedschaft, r.art, r.betrag, yn(r.optin_bestaetigt), yn(r.minderjaehrig), r.einwilligung_eltern, yn(r.updates_optin), yn(r.jahresbericht_optin), yn(r.wand_optin), yn(r.foto_freigegeben), r.quelle, new Date(r.created_at).toLocaleDateString('de-DE')]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
        const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `squadra-tre-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      });

      /* ----- Partner-Wall ----- */
      const swForm = $('[data-panel="sponsorwall"] [data-sw-form]');
      const swCtl = bindSponsorForm(swForm, { onSaved: () => { showMsg('Gespeichert.'); loadSponsorWall(); } });
      $('[data-sw-reset]', swForm).addEventListener('click', () => swCtl.fill(null));
      let sw = [];
      async function loadSponsorWall() {
        const { data, error } = await sb.from('sponsor_wall').select('*').order('created_at');
        if (error) { showMsg('Partner-Wall konnte nicht geladen werden.', true); return; }
        sw = data;
        const box = $('[data-sponsorwall]');
        box.innerHTML = data.map((r) => `<article class="member${r.freigegeben ? '' : ' is-pending'}" data-id="${r.id}">
          <div class="member-top"><div class="member-photo logo" data-logo="${escapeHtml(r.logo_pfad || '')}">${escapeHtml(initialsOf(r.firma))}</div>
            <div><div class="member-name">${escapeHtml(r.firma)}</div><div class="member-meta">${escapeHtml(r.ansprechpartner || '')} ${escapeHtml(r.paket || '')}</div></div></div>
          <div class="tags">${r.freigegeben ? '<span class="t-ok">online</span>' : '<span class="t-warn">wartet auf Freigabe</span>'}${r.user_id ? '<span>vom Partner</span>' : '<span>vom Team</span>'}</div>
          <div class="member-meta"><a href="${escapeHtml(r.website)}" target="_blank" rel="noopener">${escapeHtml(r.website)}</a><br>${SOCIAL.filter((k) => r[k]).map((k) => `<a href="${escapeHtml(r[k])}" target="_blank" rel="noopener">${k}</a>`).join(' · ')}</div>
          ${r.text ? `<p class="small">${escapeHtml(r.text)}</p>` : ''}
          <div class="member-actions">
            <button class="small-btn" data-sw="toggle">${r.freigegeben ? 'Freigabe zurückziehen' : '✓ Freigeben'}</button>
            <button class="small-btn" data-sw="edit">Bearbeiten</button>
            <button class="small-btn" data-sw="del">Löschen</button>
          </div></article>`).join('') || '<p class="muted">Noch keine Einträge. Partner legen ihren Eintrag im Login unter „Ausgabenbericht“ an.</p>';
        await Promise.all($$('[data-logo]', box).filter((el) => el.dataset.logo).map(async (el) => {
          const u = await signed('sponsoren', el.dataset.logo);
          if (u) el.innerHTML = `<img src="${escapeHtml(u)}" alt="Logo" style="object-fit:contain">`;
        }));
      }
      $('[data-sponsorwall]').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-sw]');
        if (!btn) return;
        const id = btn.closest('[data-id]').dataset.id;
        const r = sw.find((x) => x.id === id);
        if (btn.dataset.sw === 'edit') { await swCtl.fill(r); swForm.scrollIntoView({ behavior: 'smooth' }); return; }
        if (btn.dataset.sw === 'del') {
          if (!confirm(`Eintrag von ${r.firma} löschen?`)) return;
          if (r.logo_pfad) await sb.storage.from('sponsoren').remove([r.logo_pfad]);
          await sb.from('sponsor_wall').delete().eq('id', id);
        } else {
          const { error } = await sb.from('sponsor_wall').update({ freigegeben: !r.freigegeben }).eq('id', id);
          if (error) { showMsg('Fehler: ' + error.message, true); return; }
        }
        showMsg('Gespeichert. Mit „Wall of Fame veröffentlichen“ geht es online.');
        loadSponsorWall();
      });

      /* ----- Einladen: fertige Texte für Instagram ----- */
      const site = (cfg.siteUrl || location.origin).replace(/\/$/, '');
      const INVITE = [
        ['Beitrag / Story (Deutsch)', `🏁 Werde Teil der SQUADRA TRE!\nLuigis Fanclub ist kostenlos – lade dein Foto hoch und du stehst auf unserer Wall of Fame. Am Saisonende drucken wir sie und bauen sie am Rennzelt auf 📸\n👉 Link in Bio: ${site}/squadra-tre/\n#SquadraLBC3 #LBC3`],
        ['Post / Storia (Italiano)', `🏁 Entra nella SQUADRA TRE!\nIl fan club di Luigi è gratis – carica la tua foto e sarai sulla nostra Wall of Fame. A fine stagione la stampiamo e la montiamo alla tenda 📸\n👉 Link in bio: ${site}/it/squadra-tre/\n#SquadraLBC3 #LBC3`],
        ['Post / Story (English)', `🏁 Join the SQUADRA TRE!\nLuigi's fan club is free – upload your photo and you're on our Wall of Fame. At season end we print it and put it up at the race tent 📸\n👉 Link in bio: ${site}/en/squadra-tre/\n#SquadraLBC3 #LBC3`],
        ['DM an neue Follower (Deutsch)', `Ciao und danke fürs Folgen! 🙌 Hast du Lust, in Luigis Squadra Tre zu kommen? Kostenlos, mit deinem Foto auf der Wall of Fame: ${site}/squadra-tre/`],
        ['DM ai nuovi follower (Italiano)', `Ciao e grazie per il follow! 🙌 Ti va di entrare nella Squadra Tre di Luigi? È gratis, con la tua foto sulla Wall of Fame: ${site}/it/squadra-tre/`]
      ];
      function renderInvite() {
        $('[data-invite-link]').textContent = `${site}/squadra-tre/`;
        $('[data-invite-texts]').innerHTML = '<h2 class="h3">Fertige Texte</h2>' + INVITE.map(([t2, txt]) => `<h3 class="small strong mt">${escapeHtml(t2)}</h3><div class="copy-box" data-copy-src>${escapeHtml(txt)}</div><button class="btn btn-outline btn-sm" data-copy-btn>Kopieren</button>`).join('');
      }
      $('[data-panel="einladen"]').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-copy-btn]');
        if (!b) return;
        const src = b.previousElementSibling;
        try { await navigator.clipboard.writeText(src.textContent); b.textContent = 'Kopiert ✓'; setTimeout(() => { b.textContent = 'Kopieren'; }, 1400); }
        catch (err) { showMsg('Kopieren nicht möglich – bitte Text markieren und kopieren.', true); }
      });

      await loadSeason();
      showTab('bericht');
    })();
  }
})();
