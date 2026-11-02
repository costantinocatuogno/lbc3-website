/* LBC3 – Interaktionen der öffentlichen Seiten (ohne Abhängigkeiten) */
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Besucherzählung: anonym, ohne Cookies (Admins können sich im Team-Bereich ausnehmen) ---------- */
  try {
    let ich = null; try { ich = localStorage.getItem('lbc3-nicht-zaehlen'); } catch (e) { /* privat */ }
    if (!ich && !/^\/(team|admin|bericht|login|vorschau)(\/|$)/.test(location.pathname)) {
      const data = JSON.stringify({ p: location.pathname, r: document.referrer || '', l: document.documentElement.lang || 'de' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/besuch', new Blob([data], { type: 'application/json' }));
      else fetch('/api/besuch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true });
    }
  } catch (e) { /* Zählen darf nie stören */ }

  /* ---------- Klickzähler für Partner-Links: anonym (kein Cookie, keine IP, nichts im Browser gespeichert) ---------- */
  const zaehle = (ev) => {
    if (ev.type === 'auxclick' && ev.button !== 1) return; // mittlere Maustaste = neuer Tab
    const a = ev.target.closest && ev.target.closest('a[data-klick]');
    if (!a) return;
    const data = JSON.stringify({ p: a.dataset.klick, q: a.dataset.quelle || '', l: document.documentElement.lang || 'de' });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/klick', new Blob([data], { type: 'application/json' }));
      else fetch('/api/klick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true });
    } catch (e) { /* Zählen darf den Link nie blockieren */ }
  };
  document.addEventListener('click', zaehle, true);
  document.addEventListener('auxclick', zaehle, true);

  /* ---------- Mobiles Menü ---------- */
  const toggle = $('.menu-toggle');
  const nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- Sprache: Vorschlag nach Browser-Einstellung, gemerkte Wahl, keine Umleitung ---------- */
  const LANG_KEY = 'lbc3-lang';
  const store = {
    get() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) { /* privat */ } }
  };
  $$('[data-set-lang]').forEach((a) => a.addEventListener('click', () => store.set(a.dataset.setLang)));
  const banner = $('[data-lang-banner]');
  if (banner) {
    const pageLang = banner.dataset.pageLang;
    let data = {};
    try { data = JSON.parse($('[data-lb-data]', banner).textContent); } catch (e) { data = {}; }
    const saved = store.get();
    let wish = null;
    if (saved) {
      if (saved !== pageLang && data[saved]) wish = saved;
    } else {
      const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
      const first = prefs.find((l) => l === pageLang || data[l]);
      if (first && first !== pageLang) wish = first;
    }
    if (wish) {
      const d = data[wish];
      banner.setAttribute('lang', wish);
      $('[data-lb-text]', banner).textContent = d.text;
      const yes = $('[data-lb-yes]', banner);
      yes.textContent = d.yes;
      yes.href = d.href + location.search + location.hash;
      yes.addEventListener('click', () => store.set(wish));
      const no = $('[data-lb-no]', banner);
      no.textContent = d.no;
      no.addEventListener('click', () => { store.set(pageLang); banner.hidden = true; });
      banner.hidden = false;
    }
  }

  /* ---------- Formulare: Zeitstempel gegen automatisierte Spam-Absendungen ---------- */
  const tsNow = String(Date.now());
  $$('[data-ts-form] input[name="t"], input[data-ts]').forEach((i) => { i.value = tsNow; });

  const kErr = $('[data-kontakt-err]');
  if (kErr && /[?&]fehler=1/.test(location.search)) kErr.hidden = false;

  /* ---------- Intro-Video (einmal pro Sitzung) ---------- */
  const intro = $('[data-intro]');
  if (intro) {
    const video = $('[data-intro-video]', intro);
    let timer;
    const close = () => {
      if (intro.hidden || intro.classList.contains('is-leaving')) return;
      clearTimeout(timer);
      intro.classList.add('is-leaving');
      setTimeout(() => { intro.hidden = true; intro.classList.remove('is-leaving'); video.pause(); document.body.style.overflow = ''; }, 600);
    };
    const play = () => {
      if (reduceMotion) return;
      intro.hidden = false;
      document.body.style.overflow = 'hidden';
      video.currentTime = 0;
      video.muted = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => close());
      timer = setTimeout(close, 9000);
      $('[data-intro-skip]', intro).focus({ preventScroll: true });
    };
    video.addEventListener('ended', close);
    $('[data-intro-skip]', intro).addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !intro.hidden) close(); });
    $$('[data-intro-replay]').forEach((b) => b.addEventListener('click', play));
    let seen = false;
    try { seen = sessionStorage.getItem('lbc3-intro') === '1'; sessionStorage.setItem('lbc3-intro', '1'); } catch (e) { /* privat */ }
    if (!seen) play();
  }

  /* ---------- Countdown ---------- */
  $$('[data-countdown]').forEach((el) => {
    let races = [];
    try { races = JSON.parse(el.dataset.races || '[]'); } catch (e) { races = []; }
    const lang = el.dataset.lang || 'de';
    const locale = { de: 'de-DE', en: 'en-GB', it: 'it-IT', fr: 'fr-FR' }[lang] || 'de-DE';
    // Startzeiten sind deutsche Ortszeit (Europe/Berlin)
    const berlinTime = (s) => {
      if (!s) return NaN;
      if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) return new Date(s).getTime();
      const asUtc = new Date(s.length <= 10 ? s + 'T00:00:00Z' : s + (s.length === 16 ? ':00Z' : 'Z'));
      const berlin = new Date(asUtc.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
      const utc = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
      return asUtc.getTime() - (berlin.getTime() - utc.getTime());
    };
    const pad = (n) => String(n).padStart(2, '0');
    const set = (k, v) => { const n = $(`[data-cd="${k}"]`, el); if (n) n.textContent = v; };
    const tick = () => {
      const now = Date.now();
      const next = races.map((r) => ({ ...r, ts: berlinTime(r.start) })).filter((r) => r.ts > now).sort((a, b) => a.ts - b.ts)[0];
      if (!next) { ['d', 'h', 'm', 's'].forEach((k) => set(k, '--')); return; }
      $('[data-cd-track]', el).textContent = next.strecke || '';
      $('[data-cd-series]', el).textContent = [next.serie, next.klasse].filter(Boolean).join(' · ');
      $('[data-cd-date]', el).textContent = new Date(next.ts).toLocaleDateString(locale, { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' });
      let diff = Math.max(0, Math.floor((next.ts - now) / 1000));
      set('d', String(Math.floor(diff / 86400)));
      set('h', pad(Math.floor((diff % 86400) / 3600)));
      set('m', pad(Math.floor((diff % 3600) / 60)));
      set('s', pad(diff % 60));
    };
    tick();
    setInterval(tick, 1000);
  });

  /* ---------- Highlights-Karussell ---------- */
  $$('[data-carousel]').forEach((wrap) => {
    const track = $('[data-carousel-track]', wrap);
    const step = (dir) => {
      const card = track.firstElementChild;
      const w = card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
      const max = track.scrollWidth - track.clientWidth - 2;
      if (dir > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: max, behavior: reduceMotion ? 'auto' : 'smooth' });
      else track.scrollBy({ left: dir * w, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    $('[data-carousel-prev]', wrap).addEventListener('click', () => step(-1));
    $('[data-carousel-next]', wrap).addEventListener('click', () => step(1));
  });

  /* ---------- Filter (News) ---------- */
  $$('[data-filter-group]').forEach((group) => {
    const items = $$(`[data-filter-items="${group.dataset.filterGroup}"] > *`).concat($$('.news-lead'));
    $$('[data-filter]', group).forEach((btn) => btn.addEventListener('click', () => {
      $$('[data-filter]', group).forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      const f = btn.dataset.filter;
      items.forEach((it) => { it.hidden = f !== 'all' && it.dataset.cat !== f; });
    }));
  });

  /* ---------- Kapitel ---------- */
  $$('[data-chapters]').forEach((root) => {
    const tabs = $$('[data-chapter]', root);
    const pos = $('[data-chapter-pos]', root);
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const i = Number(tab.dataset.chapter);
      tabs.forEach((t, j) => { t.classList.toggle('is-active', j === i); t.setAttribute('aria-selected', String(j === i)); });
      $$('[role="tabpanel"]', root).forEach((p, j) => { p.hidden = j !== i; });
      if (pos) pos.textContent = String(i + 1);
    }));
  });

  /* ---------- Saison-Umschalter ---------- */
  $$('[data-seasons]').forEach((root) => {
    const btns = $$('[data-season]', root);
    const show = (btn) => {
      btns.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      $$('[data-season-panel]', root).forEach((p) => { p.hidden = p.dataset.seasonPanel !== btn.dataset.season; });
    };
    // Auch ohne neuen Build (z. B. am Jahreswechsel): erste Saison mit noch kommenden Rennen, sonst die neueste
    const today = new Date().toISOString().slice(0, 10);
    const asc = [...btns].sort((a, b) => Number(a.dataset.season) - Number(b.dataset.season));
    const pick = asc.find((b) => (b.dataset.seasonEnd || '') >= today) || asc[asc.length - 1];
    if (pick && !pick.classList.contains('is-active')) show(pick);
    btns.forEach((btn) => btn.addEventListener('click', () => {
      show(btn);
    }));
  });

  /* ---------- Galerie-Filter ---------- */
  $$('[data-gallery]').forEach((root) => {
    $$('[data-gfilter]', root).forEach((btn) => btn.addEventListener('click', () => {
      $$('[data-gfilter]', root).forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      const f = btn.dataset.gfilter;
      $$('.masonry-item', root).forEach((it) => { it.hidden = f !== 'all' && it.dataset.cat !== f; });
    }));
  });




  /* ---------- Story-Video: kleines Fenster, auf Wunsch Vollbild ---------- */
  $$('[data-fullscreen]').forEach((btn) => btn.addEventListener('click', () => {
    const v = btn.closest('figure').querySelector('video');
    if (!v) return;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  }));

  /* ---------- Video-Tabs: Film | Reels ---------- */
  $$('[data-vtab]').forEach((btn) => btn.addEventListener('click', () => {
    const sec = btn.closest('section');
    $$('[data-vtab]', sec).forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
    $$('[data-vpanel]', sec).forEach((p) => {
      const show = p.dataset.vpanel === btn.dataset.vtab;
      p.hidden = !show;
      if (!show) $$('video', p).forEach((v) => v.pause());
    });
  }));

  /* ---------- Reel-Player (ein Player, Auswahlliste) ---------- */
  $$('[data-reels]').forEach((root) => {
    const video = $('[data-reel-video]', root);
    const items = $$('.reel-item', root);
    const title = $('[data-reel-title]', root), text = $('[data-reel-text]', root), pos = $('[data-reel-pos]', root);
    const select = (btn, play) => {
      items.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      video.pause();
      video.poster = btn.dataset.reelPoster || '';
      video.src = btn.dataset.reelSrc;
      title.textContent = btn.dataset.reelTitel || '';
      text.textContent = btn.dataset.reelInfo || '';
      pos.textContent = btn.dataset.reelIndex || '';
      if (play) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    };
    items.forEach((b) => b.addEventListener('click', () => {
      select(b, true);
      if (window.matchMedia('(max-width: 860px)').matches) video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    video.addEventListener('ended', () => {
      const i = items.findIndex((b) => b.classList.contains('is-active'));
      if (i > -1 && i < items.length - 1) select(items[i + 1], true);
    });
  });

  /* ---------- Lightbox ---------- */
  const lb = $('[data-lightbox]');
  if (lb) {
    const imgEl = $('[data-lb-img]', lb), vidEl = $('[data-lb-video]', lb), cap = $('[data-lb-caption]', lb), posEl = $('[data-lb-pos]', lb);
    let list = [], index = 0, lastFocus = null;
    const visible = () => $$('[data-lightbox-index]').filter((b) => !b.hidden);
    const show = () => {
      const b = list[index];
      const isVideo = b.dataset.video === 'true';
      imgEl.hidden = isVideo; vidEl.hidden = !isVideo;
      if (isVideo) { vidEl.src = b.dataset.full; } else { vidEl.pause(); imgEl.src = b.dataset.full; imgEl.alt = b.dataset.caption || ''; }
      cap.textContent = b.dataset.caption || '';
      posEl.textContent = `${index + 1} / ${list.length}`;
    };
    const open = (btn) => { list = visible(); index = list.indexOf(btn); lastFocus = btn; lb.hidden = false; document.body.style.overflow = 'hidden'; show(); $('[data-lb-close]', lb).focus(); };
    const close = () => { lb.hidden = true; vidEl.pause(); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    const move = (d) => { index = (index + d + list.length) % list.length; show(); };
    $$('[data-lightbox-index]').forEach((b) => b.addEventListener('click', () => open(b)));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => move(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => move(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1); x0 = null; });
  }

  /* ---------- Squadra-3-Beitritt (mit Foto) ---------- */
  // Fotos werden im Browser auf max. 1200 px verkleinert und als JPEG gesendet (schneller Upload, kleine Dateien).
  const resizeImage = (file, max = 1200) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const im = new Image();
      im.onerror = reject;
      im.onload = () => {
        const scale = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * scale);
        c.height = Math.round(im.height * scale);
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))), 'image/jpeg', 0.85);
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  $$('[data-squadra-form]').forEach((form) => {
    const msg = $('[data-form-msg]', form);
    const card = form.closest('.form-card');
    const photoInput = $('[data-photo-input]', form);
    const preview = $('[data-photo-preview]', form);
    const consent = $('[data-photo-consent]', form);
    const parent = $('[data-parent]', form);
    const sup = $('[data-sup]', form);
    let photoBlob = null;

    const insta = $('[data-insta]', form);
    const supChoice = $('[data-sup-choice]', form);
    const supMinor = $('[data-sup-minor]', form);
    const sync = () => {
      const alter = form.alter ? form.alter.value : '';
      const minor = alter === 'unter16' || alter === '16bis17';
      // Unterstützer (mit Beitrag) und Instagram erst ab 18 – Minderjährige sind immer „Freund“
      if (supChoice) {
        const r = supChoice.querySelector('input');
        r.disabled = minor;
        if (minor && r.checked) { r.checked = false; const f = form.querySelector('input[name="mitgliedschaft"][value="freund"]'); if (f) f.checked = true; }
      }
      if (supMinor) supMinor.hidden = !minor;
      if (insta) { insta.hidden = alter !== '18plus'; if (alter !== '18plus') insta.querySelector('input').value = ''; }
      const isSup = form.mitgliedschaft && form.mitgliedschaft.value === 'unterstuetzer';
      if (sup) sup.hidden = !isSup;
      // Eltern: unter 16 immer, mit 16/17 nur für ein Foto
      const needParent = alter === 'unter16' || (alter === '16bis17' && !!photoBlob);
      if (parent) {
        parent.hidden = !needParent;
        parent.querySelector('input').required = needParent;
        $$('[data-parent-hint]', parent).forEach((h) => { h.hidden = h.dataset.parentHint !== (alter === 'unter16' ? 'u16' : 'foto'); });
      }
      if (consent) { consent.hidden = !photoBlob; consent.querySelector('input').required = !!photoBlob; }
    };
    form.addEventListener('change', sync);
    sync();

    if (photoInput) {
      photoInput.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;
        try {
          photoBlob = await resizeImage(file);
          preview.innerHTML = '';
          const im = document.createElement('img');
          im.alt = '';
          im.src = URL.createObjectURL(photoBlob);
          preview.appendChild(im);
          preview.classList.add('has-photo');
          const btnLabel = $('[data-photo-btn]', form);
          if (btnLabel) btnLabel.textContent = btnLabel.dataset.change;
        } catch (e) {
          photoBlob = null;
        }
        sync();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      const data = new FormData(form);
      data.delete('foto');
      if (photoBlob) data.append('foto', photoBlob, 'foto.jpg');
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || String(res.status));
        }
        const j = await res.json().catch(() => ({}));
        msg.innerHTML = $(j.stufe === 'unter16' ? '[data-msg-ok-parent]' : '[data-msg-ok]', card).innerHTML;
        msg.classList.remove('is-error');
        msg.hidden = false;
        form.reset();
        photoBlob = null;
        if (preview) { preview.classList.remove('has-photo'); preview.innerHTML = ''; }
        sync();
      } catch (err) {
        msg.innerHTML = $('[data-msg-err]', card).innerHTML + (err.message && !/^\d+$/.test(err.message) ? ` (${err.message})` : '');
        msg.classList.add('is-error');
        msg.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  });

  /* ---------- Hashtag kopieren ---------- */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      const old = b.innerHTML;
      b.textContent = b.dataset.copied || '✓';
      setTimeout(() => { b.innerHTML = old; }, 1400);
    } catch (e) { /* Zwischenablage nicht verfügbar */ }
  }));

  /* ---------- Squadra: Seiten mit Link aus E-Mails (bestätigen, Eltern, Daten verwalten) ---------- */
  // Der Token steht in der Adresse (?t=…). Beim Öffnen passiert nichts – erst der Knopf schickt die Entscheidung (POST).
  const sqToken = () => new URLSearchParams(location.search).get('t') || '';
  const sqTx = (root, k) => { const el = $(`template[data-tx="${k}"]`, root); return el ? el.innerHTML : ''; };
  const sqStep = (root, name) => { $$('[data-sq-step]', root).forEach((el) => { el.hidden = el.dataset.sqStep !== name; }); const l = $('[data-sq-loading]', root); if (l) l.hidden = true; };
  const sqErr = (root, text) => { const e = $('[data-sq-err]', root); e.innerHTML = text; e.hidden = false; const l = $('[data-sq-loading]', root); if (l) l.hidden = true; };
  const sqCall = async (path, opts) => {
    const res = await fetch(path, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...opts });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j.error || String(res.status)); e.status = res.status; throw e; }
    return j;
  };
  const sqFail = (root, err) => sqErr(root, [404, 410].includes(err.status) || err.status === 400 && /link|Link|lien/.test(err.message) ? sqTx(root, 'link_invalid') : `${sqTx(root, 'join_err')}${err.message && !/^\d+$/.test(err.message) ? ` (${err.message.replace(/[<>&]/g, '')})` : ''}`);

  const sqConfirm = $('[data-sq-confirm]');
  if (sqConfirm) {
    const t = sqToken();
    if (!/^[0-9a-f-]{36}$/i.test(t)) sqErr(sqConfirm, sqTx(sqConfirm, 'link_invalid'));
    $('[data-sq-go]', sqConfirm).addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        const j = await sqCall('/api/squadra-confirm', { method: 'POST', body: JSON.stringify({ t, lang: sqConfirm.dataset.lang }) });
        sqStep(sqConfirm, 'ok');
        $('[data-sq-foto-wartet]', sqConfirm).hidden = !j.foto_wartet;
      } catch (err) { sqFail(sqConfirm, err); e.target.disabled = false; }
    });
  }

  const sqParent = $('[data-sq-parent]');
  if (sqParent) {
    const t = sqToken();
    const lang = sqParent.dataset.lang;
    const form = $('form', sqParent);
    (async () => {
      if (!/^[0-9a-f-]{36}$/i.test(t)) { sqErr(sqParent, sqTx(sqParent, 'link_invalid')); return; }
      try {
        const j = await sqCall(`/api/squadra-eltern?t=${encodeURIComponent(t)}&lang=${lang}`);
        if (!j.gueltig || !j.angebot.length) { sqErr(sqParent, sqTx(sqParent, 'link_invalid')); return; }
        $('[data-el-name]', sqParent).textContent = j.name;
        if (j.spitzname) { $('[data-el-nick]', sqParent).textContent = j.spitzname; $('[data-el-nick-wrap]', sqParent).hidden = false; }
        if (j.foto) { $('[data-el-foto]', sqParent).src = `/api/squadra-eltern?t=${encodeURIComponent(t)}&foto=1`; $('[data-el-foto-wrap]', sqParent).hidden = false; }
        const werte = j.bestaetigt && j.zwecke ? j.zwecke : j.vorbelegt;
        j.angebot.forEach((z) => { const l = $(`[data-el-zweck="${z}"]`, sqParent); l.hidden = false; l.querySelector('input').checked = !!werte[z]; });
        sqStep(sqParent, 'form');
        if (j.bestaetigt) sqErr(sqParent, sqTx(sqParent, 'el_already'));
      } catch (err) { sqFail(sqParent, err); }
    })();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      const zwecke = Object.fromEntries($$('[data-el-zweck]', form).filter((l) => !l.hidden).map((l) => [l.dataset.elZweck, l.querySelector('input').checked]));
      try {
        const j = await sqCall('/api/squadra-eltern', { method: 'POST', body: JSON.stringify({ t, lang, zwecke, sorgeberechtigt: form.sorgeberechtigt.checked }) });
        $('[data-sq-err]', sqParent).hidden = true;
        sqStep(sqParent, j.geloescht ? 'deleted' : 'ok');
      } catch (err) { sqFail(sqParent, err); btn.disabled = false; }
    });
  }

  const sqManage = $('[data-sq-manage]');
  if (sqManage) {
    const t = sqToken();
    const lang = sqManage.dataset.lang;
    const form = $('form', sqManage);
    (async () => {
      if (!/^[0-9a-f-]{36}$/i.test(t)) { sqErr(sqManage, sqTx(sqManage, 'link_invalid')); return; }
      try {
        const j = await sqCall(`/api/squadra-verwalten?t=${encodeURIComponent(t)}&lang=${lang}`);
        $('[data-mg-name]', sqManage).textContent = j.name || '';
        $('[data-mg-opt="foto"]', sqManage).hidden = !j.foto;
        $('[data-mg-opt="wall"]', sqManage).hidden = !j.wall && !j.foto;
        $('[data-mg-opt="abmelden"]', sqManage).hidden = !j.mails;
        sqStep(sqManage, 'form');
      } catch (err) { sqFail(sqManage, err); }
    })();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const aktion = form.aktion.value;
      if (aktion === 'austritt' && !confirm($(`template[data-tx="mg_confirm_leave"]`, sqManage).content.textContent)) return;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        await sqCall('/api/squadra-verwalten', { method: 'POST', body: JSON.stringify({ t, lang, aktion }) });
        $('[data-mg-done]', sqManage).innerHTML = sqTx(sqManage, `mg_done_${aktion}`);
        $('[data-sq-err]', sqManage).hidden = true;
        sqStep(sqManage, 'ok');
      } catch (err) { sqFail(sqManage, err); btn.disabled = false; }
    });
  }

  /* ---------- Kontaktformular: Anliegen aus Link vorauswählen ---------- */
  const topic = $('[data-topic]');
  if (topic) {
    const a = new URLSearchParams(location.search).get('anliegen');
    if (a && $(`option[value="${a}"]`, topic)) topic.value = a;
  }
})();
