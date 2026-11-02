/* LBC3 – Druckansicht der Wall of Fame (nur Team, L15).
   Die Seite selbst enthält keine Namen oder Fotos: nach dem Admin-Login lädt dieses Skript die Daten von
   /api/squadra-druck (prüft die Admin-Rolle auf dem Server) und baut die Druckbögen auf. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (name) => String(name || '?').replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '3';
  const pw = $('[data-print-wall]');
  if (!pw) return;
  const info = $('[data-pw-info]');
  const cfg = window.LBC3_CONFIG || {};

  const tile = (m, i) => {
    const tone = ['red', 'gold', 'dark'][i % 3];
    const photo = m.foto ? `<img src="${esc(m.foto)}" alt="">` : `<span class="fame-initials tone-${tone}" aria-hidden="true">${esc(initials(m.name))}</span>`;
    return `<figure class="fame-tile${m.unterstuetzer ? ' is-sup' : ''}"><div class="fame-photo">${photo}</div><figcaption>${esc(m.name)}</figcaption></figure>`;
  };
  const sponsor = (s) => `
    <div class="pw-sponsor">
      <div class="pw-logo">${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.firma)}">` : `<span>${esc(s.firma)}</span>`}</div>
      <strong>${esc(s.firma)}</strong>
      <small>${esc(String(s.website || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</small>
    </div>`;

  const stage = $('[data-pw-stage]');
  const sheets = $$('[data-pw-sheet]');
  const fmt = $('[data-pw-format]');
  const what = $('[data-pw-content]');
  const pageStyle = document.createElement('style');
  document.head.appendChild(pageStyle);
  const MM = 96 / 25.4; // px pro mm (CSS-Pixel)
  const layout = () => {
    const [w, h] = fmt.value.split('x').map(Number);
    pageStyle.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
    const show = what.value;
    sheets.forEach((sh) => {
      sh.hidden = show !== 'beide' && sh.dataset.pwSheet !== show;
      sh.style.width = `${w}mm`;
      sh.style.height = `${h}mm`;
      sh.style.setProperty('--u', `${Math.min(w, h) / 100}mm`);
      // Spaltenzahl so wählen, dass alle Kacheln die Fläche möglichst gut füllen
      const grid = $('[data-pw-grid]', sh);
      if (grid) {
        const n = Math.max(grid.children.length, 1);
        const usableH = h * 0.66, usableW = w * 0.93;
        let cols = 4;
        while (cols < 60 && Math.ceil(n / cols) * (usableW / cols) * 1.3 > usableH) cols++;
        grid.style.setProperty('--cols', cols);
      }
    });
    const scale = Math.min(1, (stage.clientWidth - 2) / (w * MM));
    sheets.forEach((sh) => { sh.style.setProperty('--scale', scale); sh.style.marginBottom = `${-(h * MM) * (1 - scale) + 24}px`; });
  };
  fmt.addEventListener('change', layout);
  what.addEventListener('change', layout);
  window.addEventListener('resize', layout);
  $('[data-pw-print]').addEventListener('click', () => window.print());
  layout();

  (async () => {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase || window.__supabaseMissing) { info.textContent = 'Login ist nicht eingerichtet.'; return; }
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.replace('/login/'); return; }
    try {
      const res = await fetch('/api/squadra-druck', { headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Fehler ${res.status}`);
      $('[data-pw-grid]').innerHTML = j.mitglieder.map(tile).join('');
      $('[data-pw-sponsors]').innerHTML = j.sponsoren.map(sponsor).join('');
      info.textContent = `${j.mitglieder.length} Mitglieder · ${j.sponsoren.length} Partner`;
      layout();
    } catch (err) {
      info.textContent = `Daten nicht geladen: ${err.message}`;
    }
  })();
})();
