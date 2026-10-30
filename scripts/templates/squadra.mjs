// Squadra Tre (Fanclub), Wall of Fame (Mitglieder + Partner) und Druckansicht der Fotowand.
import { esc, icon, img, flagsIT } from '../lib/html.mjs';
import { url, t } from '../lib/i18n.mjs';
import { layout } from './layout.mjs';
import { klick } from './parts.mjs';

const SOCIAL = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const initials = (name) => String(name || '?').replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '3';

/* ---------- Kacheln der Wall of Fame ---------- */
export function fameTile(m, i) {
  const tone = ['red', 'gold', 'dark'][i % 3];
  const photo = m.foto
    ? `<img src="${esc(img(m.foto, 400))}" alt="" loading="lazy">`
    : `<span class="fame-initials tone-${tone}" aria-hidden="true">${esc(initials(m.name))}</span>`;
  return `<figure class="fame-tile${m.unterstuetzer ? ' is-sup' : ''}"><div class="fame-photo">${photo}</div><figcaption>${esc(m.name)}</figcaption></figure>`;
}

export function wallGrid(lang, wall, { limit = 0, cta = true } = {}) {
  const _ = t(lang);
  const list = limit ? wall.mitglieder.slice(-limit).reverse() : wall.mitglieder;
  return `
  <div class="fame-grid">
    ${list.map(fameTile).join('')}
    ${cta ? `<a class="fame-tile is-you" href="${url(lang, '/squadra-tre/#beitreten')}"><div class="fame-photo"><span class="fame-initials">+</span></div><figcaption>${_('wall_empty_you')}</figcaption></a>` : ''}
  </div>`;
}

/* ---------- Partner-Wall ---------- */
export function sponsorCard(lang, s) {
  const _ = t(lang);
  const web = safeUrl(s.website);
  const socials = SOCIAL.filter((k) => safeUrl(s.social?.[k]))
    .map((k) => `<a class="social-btn" href="${esc(s.social[k])}" rel="noopener" target="_blank"${klick(s.firma, `wall-${k}`)} aria-label="${esc(s.firma)} auf ${k}">${icon[k]}</a>`).join('');
  return `
    <article class="sp-card">
      <div class="sp-logo">${s.logo ? `<img src="${esc(img(s.logo, 600))}" alt="${esc(s.firma)}" loading="lazy">` : `<span>${esc(s.firma)}</span>`}</div>
      <div class="sp-body">
        ${s.paket ? `<div class="eyebrow muted">${esc(s.paket)}</div>` : ''}
        <h3 class="h3">${esc(s.firma)}</h3>
        ${s.text ? `<p>${esc(s.text)}</p>` : ''}
        <div class="sp-links">
          ${web ? `<a class="btn btn-outline btn-sm" href="${esc(web)}" rel="noopener" target="_blank"${klick(s.firma, 'wall')}>${icon.globe}<span>${_('sp_wall_visit')}</span></a>` : ''}
          ${socials}
        </div>
      </div>
    </article>`;
}

export function sponsorWall(lang, wall) {
  const _ = t(lang);
  return `
<section class="wrap section" id="wall-of-fame">
  <div class="eyebrow">${_('sp_wall_kicker')}</div>
  <h2 class="h2">${_('sp_wall_title')}</h2>
  <p class="lead">${_('sp_wall_text')}</p>
  ${wall.beispiel ? `<p class="note-box small">${_('sp_wall_example')}</p>` : ''}
  <div class="sp-grid">
    ${wall.sponsoren.map((s) => sponsorCard(lang, s)).join('')}
    <a class="sp-card is-cta" href="${url(lang, '/kontakt/?anliegen=sponsoring')}"><div class="sp-logo"><span>${_('your_logo')}</span></div></a>
  </div>
</section>`;
}

/* ---------- Beitrittsformular ---------- */
export function joinForm(lang, ctx) {
  const _ = t(lang);
  const ds = url(lang, '/datenschutz/');
  return `
<div class="card form-card" id="beitreten">
  <form class="form" data-squadra-form method="post" action="/api/squadra-join" enctype="multipart/form-data" novalidate>
    <input type="hidden" name="lang" value="${lang}">
    <input type="hidden" name="t" value="" data-ts>
    <p class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
    <h3 class="h2">${_('join_title')}</h3>

    <fieldset class="field">
      <legend>${_('f_membership')}</legend>
      <div class="choice">
        <label><input type="radio" name="mitgliedschaft" value="unterstuetzer" checked><span><strong>${_('sq_sup_t')}</strong><small>${_('sq_sup_p')}</small></span></label>
        <label><input type="radio" name="mitgliedschaft" value="freund"><span><strong>${_('sq_free_t')}</strong><small>${_('sq_free_p')}</small></span></label>
      </div>
    </fieldset>

    <div class="photo-pick" data-photo-pick>
      <div class="photo-preview" data-photo-preview>${icon.camera}</div>
      <div>
        <span class="field-label">${_('f_photo')}</span>
        <label class="btn btn-outline btn-sm"><input type="file" name="foto" accept="image/jpeg,image/png,image/webp" data-photo-input hidden><span data-photo-btn data-change="${esc(_('f_photo_change'))}">${_('f_photo_btn')}</span></label>
        <small class="muted">${_('f_photo_hint')}</small>
      </div>
    </div>

    <div class="grid-2 tight">
      <label class="field"><span>${_('f_name')}</span><input name="name" required maxlength="120" autocomplete="name"></label>
      <label class="field"><span>${_('f_email')}</span><input name="email" type="email" required maxlength="200" autocomplete="email"></label>
    </div>
    <label class="field"><span>${_('f_insta')}</span><input name="instagram" maxlength="40" placeholder="@" autocomplete="off"></label>

    <fieldset class="field">
      <legend>${_('f_age')}</legend>
      <div class="choice">
        <label><input type="radio" name="alter" value="16plus" required><span>${_('age_16')}</span></label>
        <label><input type="radio" name="alter" value="unter16"><span>${_('age_u16')}</span></label>
      </div>
    </fieldset>
    <label class="field" data-parent hidden><span>${_('f_parent')}</span><input name="eltern_email" type="email" maxlength="200"><small class="muted">${_('f_parent_hint')}</small></label>

    <div data-sup>
      <div class="grid-2 tight">
        <label class="field"><span>${_('f_type')}</span>
          <select name="art"><option value="einmalig">${_('type_once')}</option><option value="jaehrlich">${_('type_yearly')}</option><option value="sachleistung">${_('type_kind')}</option></select>
        </label>
        <label class="field"><span>${_('f_amount')}</span><input name="betrag" type="number" min="1" step="1" inputmode="numeric"></label>
      </div>
      <label class="check"><input type="checkbox" name="jahresbericht" value="1"><span>${_('f_report')}</span></label>
    </div>

    <label class="check" data-photo-consent hidden><input type="checkbox" name="foto_einwilligung" value="1"><span>${_('f_photo_ok')}</span></label>
    <label class="check"><input type="checkbox" name="wand" value="1"><span>${_('f_wall')}</span></label>
    <label class="check"><input type="checkbox" name="updates" value="1"><span>${_('f_updates')}</span></label>
    <label class="check"><input type="checkbox" name="datenschutz" value="1" required><span>${_('f_privacy').replace('{ds}', ds)}</span></label>
    <button class="btn btn-red btn-block" type="submit">${_('join_btn')}</button>
    <p class="muted small">${_('join_note')}</p>
    <div class="form-msg" data-form-msg role="status" hidden></div>
  </form>
  <template data-msg-ok><strong>${_('join_ok_title')}</strong> ${_('join_ok_text')}</template>
  <template data-msg-err>${_('join_err')}</template>
</div>`;
}

/* ---------- Seite /squadra-tre/ ---------- */
export function squadra(lang, ctx, wall) {
  const _ = t(lang);
  const c = ctx.content;
  const site = c.site;
  const tag = site.squadra_hashtag || '#SquadraTre';
  const main = site.hashtag || '#LBC3';
  const n = wall.mitglieder.length;
  const body = `
<section class="sq-hero">
  <div class="wrap sq-hero-inner">
    <div>
      ${flagsIT()}
      <div class="eyebrow gold">${_('sq_kicker')}</div>
      <h1 class="h1 big light">${_('sq_title')}</h1>
      <p class="lead light">${_('sq_intro')}</p>
      <div class="btn-row">
        <a class="btn btn-red" href="#beitreten">${_('join_now')}</a>
        <a class="btn btn-ghost-light" href="${esc(site.instagram)}" rel="noopener" target="_blank">${icon.instagram}<span>${_('sq_follow')}</span></a>
        ${site.tiktok ? `<a class="btn btn-ghost-light" href="${esc(site.tiktok)}" rel="noopener" target="_blank">${icon.tiktok}<span>TikTok</span></a>` : ''}
        ${site.youtube ? `<a class="btn btn-ghost-light" href="${esc(site.youtube)}" rel="noopener" target="_blank">${icon.youtube}<span>YouTube</span></a>` : ''}
      </div>
    </div>
    <div class="sq-tags">
      <button type="button" class="tag-chip big" data-copy="${esc(tag)}" data-copied="${esc(_('sq_copied'))}">${esc(tag)} ${icon.copy}</button>
      <button type="button" class="tag-chip" data-copy="${esc(main)}" data-copied="${esc(_('sq_copied'))}">${esc(main)} ${icon.copy}</button>
      <div class="sq-number" aria-hidden="true">3</div>
    </div>
  </div>
</section>

<section class="wrap section">
  <h2 class="h2">${_('sq_how')}</h2>
  <div class="grid-3 steps">
    <div class="card"><div class="step-num">01</div><h3 class="h3">${_('sq_s1_t')}</h3><p>${_('sq_s1')}</p></div>
    <div class="card"><div class="step-num">02</div><h3 class="h3">${_('sq_s2_t')}</h3><p>${_('sq_s2')}</p></div>
    <div class="card"><div class="step-num">03</div><h3 class="h3">${_('sq_s3_t')}</h3><p>${_('sq_s3')}</p></div>
  </div>
</section>

<section class="wrap section two-col align-start sq-join">
  <div>
    <h2 class="h2">${_('sq_types')}</h2>
    <div class="card way way-dark">
      <div class="row-between"><h3 class="h3">${_('sq_sup_t')}</h3><span class="badge">${_('sq_sup_p')}</span></div>
      <ul class="lines"><li>${_('sq_sup_b1')}</li><li>${_('sq_sup_b2')}</li><li>${_('sq_sup_b3')}</li></ul>
    </div>
    <div class="card way way-red mt-s">
      <div class="row-between"><h3 class="h3">${_('sq_free_t')}</h3><span class="badge ok">${_('sq_free_p')}</span></div>
      <ul class="lines"><li>${_('sq_free_b1')}</li><li>${_('sq_free_b2')}</li><li>${_('sq_free_b3')}</li></ul>
    </div>
    <div class="card hashtag-card mt-s">
      <div class="eyebrow">${_('sq_hashtag_t')}</div>
      <p>${_('sq_hashtag').replace('{handle}', esc(site.instagram_handle))}</p>
    </div>
  </div>
  ${joinForm(lang, ctx)}
</section>

<section class="band-dark" id="wall">
  <div class="wrap section">
    <div class="section-head">
      <div>
        <div class="eyebrow gold">${esc(tag)} · ${esc(main)}</div>
        <h2 class="h1 big light">${_('wall_title')}</h2>
      </div>
      <div class="fame-count"><strong>${n}</strong><span>${_('wall_members')}</span></div>
    </div>
    ${wall.beispiel ? `<p class="muted-light small">${_('wall_example')}</p>` : ''}
    ${wallGrid(lang, wall)}
    <p class="muted-light mt">${_('wall_print_note')}</p>
  </div>
</section>`;
  return layout({ lang, path: '/squadra-tre/', title: `Squadra Tre · ${tag}`, description: _('sq_intro'), body, ctx, active: '/squadra-tre/' });
}

/* ---------- Druckansicht /wall-of-fame/druck/ ---------- */
export function wallPrint(ctx, wall) {
  const site = ctx.content.site;
  const tag = site.squadra_hashtag || '#SquadraTre';
  const saison = site.saison_wall || String(new Date().getFullYear());
  const tiles = wall.mitglieder.map(fameTile).join('');
  const sponsors = wall.sponsoren.map((s) => `
    <div class="pw-sponsor">
      <div class="pw-logo">${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.firma)}">` : `<span>${esc(s.firma)}</span>`}</div>
      <strong>${esc(s.firma)}</strong>
      <small>${esc(String(s.website || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</small>
    </div>`).join('');
  const header = (title) => `
    <header class="pw-head">
      <img src="/assets/img/lbc3-logo.png" alt="LBC3">
      <div><div class="pw-kicker">Luigi Battista Catuogno · Saison ${esc(saison)}</div><div class="pw-title">${title}</div></div>
      <div class="pw-tags"><span>${esc(tag)}</span><span>${esc(site.hashtag || '#LBC3')}</span><span>${esc(site.instagram_handle)}</span></div>
    </header>
    <div class="pw-flag"></div>`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wall of Fame drucken · LBC3</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="stylesheet" href="/assets/css/site.css?v=${ctx.version}">
</head>
<body class="page-print">
<div class="pw-toolbar no-print" data-print-wall>
  <a class="brand" href="/"><img src="/assets/img/lbc3-logo.png" alt="" width="30" height="38"><strong>Wall of Fame · Druck</strong></a>
  <label class="field inline"><span>Format</span>
    <select data-pw-format>
      <option value="841x1189">A0 Hochformat (84 × 119 cm)</option>
      <option value="1189x841">A0 Querformat</option>
      <option value="594x841">A1 Hochformat (59 × 84 cm)</option>
      <option value="2000x1000">Banner 200 × 100 cm</option>
      <option value="3000x2000" selected>Fotowand 300 × 200 cm</option>
      <option value="210x297">A4 (Probedruck)</option>
    </select>
  </label>
  <label class="field inline"><span>Inhalt</span>
    <select data-pw-content><option value="beide">Squadra Tre + Partner</option><option value="squadra">Nur Squadra Tre</option><option value="sponsoren">Nur Partner</option></select>
  </label>
  <button type="button" class="btn btn-red btn-sm" data-pw-print>Drucken / als PDF speichern</button>
  <span class="muted small">${wall.mitglieder.length} Mitglieder · ${wall.sponsoren.length} Partner${wall.beispiel ? ' · <strong>Beispieldaten</strong>' : ''}</span>
</div>
<p class="pw-help no-print">Tipp: Im Druckdialog „Als PDF speichern“ wählen, Ränder auf „Keine“ und „Hintergrundgrafiken“ einschalten. Die PDF-Datei geht dann an die Druckerei. Es erscheinen nur freigegebene Fotos und Einträge.</p>
<div class="pw-stage" data-pw-stage>
  <section class="pw-sheet" data-pw-sheet="squadra">
    ${header('SQUADRA <span>TRE</span> · WALL OF FAME')}
    <div class="pw-grid" data-pw-grid>${tiles}</div>
    <footer class="pw-foot">Grazie a tutti! · Danke an alle! · Forza Luigi #3</footer>
  </section>
  <section class="pw-sheet" data-pw-sheet="sponsoren">
    ${header('WALL OF FAME · <span>PARTNER</span>')}
    <div class="pw-sponsors">${sponsors}</div>
    <footer class="pw-foot">Danke für eure Unterstützung · Grazie per il vostro supporto</footer>
  </section>
</div>
<script src="/assets/js/site.js?v=${ctx.version}" defer></script>
</body>
</html>`;
}
