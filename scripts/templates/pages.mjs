import { esc, picture, icon, img, flagsIT } from '../lib/html.mjs';
import { url, t, formatDate } from '../lib/i18n.mjs';
import { markdown } from '../lib/markdown.mjs';
import { layout } from './layout.mjs';
import { countdownCard, pageHead } from './parts.mjs';
import { wallGrid, sponsorWall } from './squadra.mjs';

const CATS = ['Rennen', 'Team', 'Partner'];

/* ---------------- NEWS ---------------- */
export function newsList(lang, ctx) {
  const _ = t(lang);
  const [lead, ...rest] = ctx.content.news;
  const filters = ['all', ...CATS].map((c, i) => `<button type="button" class="pill${i === 0 ? ' is-active' : ''}" data-filter="${c}" aria-pressed="${i === 0}">${c === 'all' ? _('all') : _(`cat_${c}`)}</button>`).join('');
  const card = (n) => `
    <article class="news-card" data-cat="${esc(n.kategorie)}">
      <a href="${url(lang, `/news/${n.slug}/`)}" class="news-card-img">${picture(n.vorschaubild || n.titelbild, n.titel, { width: 800, sizes: '(max-width: 760px) 100vw, 33vw' })}</a>
      <div class="news-card-body">
        <div class="meta"><span class="red">${_(`cat_${n.kategorie}`)}</span><span>${formatDate(n.datum, lang)}</span></div>
        <h3 class="h3"><a href="${url(lang, `/news/${n.slug}/`)}">${esc(n.titel)}</a></h3>
        <p>${esc(n.teaser || '')}</p>
        <a class="link" href="${url(lang, `/news/${n.slug}/`)}">${_('read_more')} ${icon.arrow}</a>
      </div>
    </article>`;
  const body = `
${pageHead(_('news_kicker'), _('news_title'), `<div class="pill-row" data-filter-group="news">${filters}</div>${_('news_lang_note') ? `<p class="muted small">${_('news_lang_note')}</p>` : ''}`)}
${lead ? `
<section class="wrap">
  <a class="news-lead" href="${url(lang, `/news/${lead.slug}/`)}" data-cat="${esc(lead.kategorie)}">
    ${picture(lead.vorschaubild || lead.titelbild, lead.titel, { width: 1200, sizes: '(max-width: 760px) 100vw, 50vw', eager: true })}
    <div class="news-lead-body">
      <div class="meta"><span class="badge-red">${_(`cat_${lead.kategorie}`)}</span><span>${formatDate(lead.datum, lang)}</span></div>
      <h2 class="h2">${esc(lead.titel)}</h2>
      <p>${esc(lead.teaser || '')}</p>
      <span class="link">${_('read_more')} ${icon.arrow}</span>
    </div>
  </a>
</section>` : ''}
<section class="wrap section">
  <div class="grid-3" data-filter-items="news">${rest.map(card).join('')}</div>
</section>`;
  return layout({ lang, path: '/news/', title: _('nav_news'), body, ctx, active: '/news/' });
}

export function newsDetail(lang, ctx, n) {
  const _ = t(lang);
  const gal = (n.galerie || []).filter(Boolean);
  const body = `
<article class="wrap article">
  <a class="link back" href="${url(lang, '/news/')}">${icon.prev} ${_('back_news')}</a>
  <div class="meta"><span class="badge-red">${_(`cat_${n.kategorie}`)}</span><span>${formatDate(n.datum, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
  <h1 class="h1">${esc(n.titel)}</h1>
  ${n.teaser ? `<p class="lead">${esc(n.teaser)}</p>` : ''}
  ${picture(n.titelbild, n.titel, { width: 1600, cls: 'article-hero', eager: true })}
  <div class="prose">${markdown(n.body)}</div>
  ${gal.length ? `<div class="grid-3 article-gallery" data-lightbox-group>${gal.map((g, i) => `<button type="button" class="square-photo" data-lightbox-index="${i}" data-full="${esc(img(g, 1800))}" data-caption="${esc(n.titel)}" aria-label="${_('enlarge')}">${picture(g, n.titel, { width: 600 })}</button>`).join('')}</div>` : ''}
</article>
${lightbox(lang)}`;
  return layout({ lang, path: `/news/${n.slug}/`, title: n.titel, description: n.teaser, body, ctx, active: '/news/', ogImage: img(n.vorschaubild || n.titelbild, 1200) });
}

/* ---------------- ÜBER LUIGI ---------------- */
export function ueber(lang, ctx) {
  const _ = t(lang);
  const c = ctx.content;
  const f = c.fahrerFor(lang);
  const tx = c.texte(lang);
  const kap = c.kapitelFor(lang);
  const facts = [
    ['f_startnummer', '3'], ['f_nationalitaet', f.nationalitaet], ['f_chassis', f.chassis], ['f_klasse', f.klasse],
    ['f_team', f.team], ['f_lieblingsstrecke', f.lieblingsstrecke], ['f_idole', f.idole], ['f_ziel', f.ziel]
  ];
  const body = `
<section class="wrap two-col hero-about">
  <div>
    <div class="eyebrow">${_('ueber_kicker')}</div>
    <h1 class="h1 big">${_('ueber_title')}</h1>
    <p class="lead">${esc(tx.ueber_intro)}</p>
  </div>
  <div class="about-photo">
    ${picture(c.site.hero_bild, 'Luigi im Kart', { width: 1000, sizes: '(max-width: 760px) 100vw, 45vw', eager: true })}
    <span class="about-3" aria-hidden="true">3</span>
  </div>
</section>

${(() => {
  const vids = (c.site.videos || []).filter((v) => v && v.datei);
  const wide = c.site.video_breit && c.site.video_breit.datei ? c.site.video_breit : null;
  if (!vids.length && !wide) return '';
  const first = vids[0] || {};
  const pad = (n) => String(n).padStart(2, '0');
  return `
<section class="wrap section">
  <div class="section-head"><div><div class="eyebrow">${_('videos_kicker')}</div><h2 class="h2">${_('videos_title')}</h2></div></div>
  ${wide && vids.length ? `<div class="pill-row video-tabs" role="tablist">
    <button type="button" role="tab" class="chip is-active" aria-selected="true" data-vtab="reels">${_('tab_reels')} (${vids.length})</button>
    <button type="button" role="tab" class="chip" aria-selected="false" data-vtab="film">${_('tab_story')}</button>
  </div>` : ''}

  ${vids.length ? `<div class="reel-player" data-reels data-vpanel="reels">
    <div class="reel-stage">
      <video data-reel-video src="${esc(first.datei)}"${first.vorschau ? ` poster="${esc(first.vorschau)}"` : ''} controls playsinline preload="metadata"></video>
    </div>
    <div class="reel-side">
      <div class="reel-now" aria-live="polite">
        <div class="eyebrow"><span data-reel-pos>01</span> / ${pad(vids.length)}</div>
        <h3 class="h2" data-reel-title>${esc(first.titel || '')}</h3>
        <p class="lead" data-reel-text>${esc(first.text || '')}</p>
      </div>
      <ol class="reel-list">${vids.map((v, i) => `
        <li><button type="button" class="reel-item${i === 0 ? ' is-active' : ''}" aria-pressed="${i === 0}" data-reel-src="${esc(v.datei)}" data-reel-poster="${esc(v.vorschau || '')}" data-reel-titel="${esc(v.titel || '')}" data-reel-info="${esc(v.text || '')}" data-reel-index="${pad(i + 1)}">
          <span class="reel-thumb">${v.vorschau ? `<img src="${esc(img(v.vorschau, 300))}" alt="" loading="lazy">` : ''}<span class="reel-play" aria-hidden="true">▶</span></span>
          <span class="reel-meta"><span class="reel-num">${pad(i + 1)}</span><span class="reel-name">${esc(v.titel || '')}</span></span>
        </button></li>`).join('')}
      </ol>
    </div>
  </div>` : ''}
  ${wide ? `<figure class="film" data-vpanel="film"${vids.length ? ' hidden' : ''}>
    <video src="${esc(wide.datei)}"${wide.vorschau ? ` poster="${esc(wide.vorschau)}"` : ''} controls playsinline preload="none"></video>
    <figcaption><strong>${esc(wide.titel || '')}</strong>${wide.text ? `<span>${esc(wide.text)}</span>` : ''}</figcaption>
  </figure>` : ''}
</section>`;
})()}

<section class="band-white">
  <div class="wrap section">
    <h2 class="h2">${_('steckbrief')}</h2>
    <dl class="facts">${facts.map(([k, v], i) => {
      const link = k === 'f_team' && /^https?:\/\//.test(f.team_link || '') ? f.team_link : '';
      const val = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v);
      return `<div><dt>${_(k)}</dt><dd${i === facts.length - 1 ? ' class="red"' : ''}>${val}</dd></div>`;
    }).join('')}</dl>
  </div>
</section>

${tx.helm_titel && (tx.helm_bilder || []).length ? `
<section class="wrap section helm-section">
  <div class="helm-grid">
    <div class="helm-text">
      <div class="eyebrow">${_('helm_kicker')}</div>
      <h2 class="h2">${esc(tx.helm_titel)}</h2>
      ${String(tx.helm_text || '').split(/\n\s*\n/).filter(Boolean).map((para, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(para.trim())}</p>`).join('')}
    </div>
    <div class="helm-photos" data-lightbox-group>
      ${tx.helm_bilder.filter((b) => b && b.bild).map((b, i) => `<button type="button" class="helm-photo${i === 0 ? ' is-main' : ''}" data-lightbox-index="${i}" data-full="${esc(img(b.bild, 1800))}" data-caption="${esc(b.text || '')}" aria-label="${_('enlarge')}: ${esc(b.text || '')}">${picture(b.bild, b.text || '', { width: i === 0 ? 900 : 500, sizes: '(max-width: 760px) 100vw, 25vw' })}</button>`).join('')}
    </div>
  </div>
</section>` : ''}

<section class="wrap section" data-chapters>
  <div class="section-head"><h2 class="h2 xl">${_('chapters_title')}</h2><span class="muted"><span data-chapter-pos>1</span> / ${kap.length}</span></div>
  <div class="pill-row" role="tablist">
    ${kap.map((k, i) => `<button type="button" role="tab" class="chip${i === 0 ? ' is-active' : ''}" aria-selected="${i === 0}" aria-controls="kap-${i}" id="kap-tab-${i}" data-chapter="${i}">${esc(k.nummer)} ${esc(k.kurztitel)}</button>`).join('')}
  </div>
  ${kap.map((k, i) => `
  <div class="chapter card" role="tabpanel" id="kap-${i}" aria-labelledby="kap-tab-${i}"${i === 0 ? '' : ' hidden'}>
    <div class="chapter-text">
      <div class="chapter-num">${esc(k.nummer)}</div>
      <div class="eyebrow muted">${esc(k.jahr)}</div>
      <h3 class="h2">${esc(k.titel)}</h3>
      <p class="lead">${esc(k.text)}</p>
    </div>
    ${picture(k.bild, k.titel, { width: 900, sizes: '(max-width: 760px) 100vw, 45vw', cls: 'chapter-img' })}
  </div>`).join('')}
</section>

<section class="wrap section cta-row">
  <h2 class="h2">${_('next_chapter')}</h2>
  <a class="btn btn-red" href="${url(lang, '/partner/')}">${_('btn_partner')}</a>
</section>${(tx.helm_bilder || []).length ? lightbox(lang) : ''}`;
  return layout({ lang, path: '/ueber-luigi/', title: _('nav_ueber'), body, ctx, active: '/ueber-luigi/' });
}

/* ---------------- KALENDER ---------------- */
export function kalender(lang, ctx) {
  const _ = t(lang);
  const c = ctx.content;
  const seasons = c.saisons.length ? c.saisons : [new Date().getFullYear()];
  const current = seasons.find((s) => c.rennen.some((r) => Number(r.saison) === s && r.status === 'gefahren')) || seasons[0];
  const rows = (s) => c.rennen.filter((r) => Number(r.saison) === s).sort((a, b) => String(a.start).localeCompare(String(b.start))).map((r) => `
    <tr${r.status === 'nicht_gefahren' ? ' class="is-dns"' : ''}>
      <td>${formatDate(r.start, lang)}</td><td>${esc(r.serie)}</td><td><strong>${esc(r.strecke)}</strong>${r.land ? `<span class="muted small"> · ${esc(r.land)}</span>` : ''}</td>
      <td>${esc(r.qualifying || '–')}</td><td>${esc(r.heat1 || '–')}</td><td>${esc(r.heat2 || '–')}</td><td class="red strong">${r.finale ? `P${esc(r.finale)}` : '–'}</td>
      <td><span class="status ${r.status === 'bevorstehend' ? 'is-next' : r.status === 'angemeldet' ? 'is-reg' : r.status === 'nicht_gefahren' ? 'is-dns' : ''}">${_(`st_${r.status}`)}</span>${r.status === 'nicht_gefahren' && r.grund ? `<span class="muted small status-why">${esc(_(`grund_${r.grund}`) === `grund_${r.grund}` ? r.grund : _(`grund_${r.grund}`))}</span>` : ''}</td>
    </tr>`).join('');
  const body = `
${pageHead('/on-track', _('kal_title'))}
<section class="wrap">${countdownCard(lang, ctx, { image: c.site.hero_bild ? '/uploads/ampfing-2026/seitenansicht-vollgas.jpg' : '' })}</section>
<section class="wrap section" data-seasons>
  <div class="section-head">
    <h2 class="h2">${_('season')}</h2>
    <div class="pill-row">${seasons.map((s) => `<button type="button" class="pill${s === current ? ' is-active' : ''}" data-season="${s}" aria-pressed="${s === current}">${s}</button>`).join('')}</div>
  </div>
  ${seasons.map((s) => `
  <div class="table-box" data-season-panel="${s}"${s === current ? '' : ' hidden'}>
    <table class="table">
      <thead><tr><th>${_('col_date')}</th><th>${_('col_series')}</th><th>${_('col_track')}</th><th>${_('col_quali')}</th><th>${_('col_heat1')}</th><th>${_('col_heat2')}</th><th>${_('col_final')}</th><th>${_('col_status')}</th></tr></thead>
      <tbody>${rows(s)}</tbody>
    </table>
  </div>`).join('')}
</section>
<section class="wrap section stats">
  <div class="stat"><div class="stat-num">${c.stats.rennen}</div><div class="stat-label">${_('stat_races')}</div></div>
  <div class="stat"><div class="stat-num">${c.stats.podien}</div><div class="stat-label">${_('stat_podiums')}</div></div>
  <div class="stat"><div class="stat-num">${c.stats.siege}</div><div class="stat-label">${_('stat_wins')}</div></div>
  <div class="stat"><div class="stat-num">${c.stats.beste ? `P${c.stats.beste}` : '–'}</div><div class="stat-label">${_('best')}</div></div>
</section>`;
  return layout({ lang, path: '/kalender/', title: _('nav_kalender'), body, ctx, active: '/kalender/' });
}

/* ---------------- GALERIE: Serie → Jahr → Strecke ---------------- */
function galCrumbs(lang, _, items) {
  const all = [[_('nav_galerie'), '/galerie/'], ...items];
  return `<nav class="crumbs" aria-label="${_('breadcrumb')}">${all.map(([label, path], i) => i < all.length - 1
    ? `<a href="${url(lang, path)}">${esc(label)}</a><span aria-hidden="true">/</span>`
    : `<span aria-current="page">${esc(label)}</span>`).join('')}</nav>`;
}
function galCard(lang, _, { href, cover, kicker, title, meta }) {
  return `<a class="gal-card" href="${url(lang, href)}">
    <div class="gal-card-img${cover ? '' : ' is-empty'}">${cover ? picture(cover, title, { width: 900, sizes: '(max-width: 760px) 100vw, 33vw' }) : `<img class="gal-ph" src="/assets/img/lbc3-logo.png" alt="" aria-hidden="true"><span class="gal-ph-text">${_('gal_soon')}</span>`}</div>
    <div class="gal-card-body">${kicker ? `<div class="eyebrow">${esc(kicker)}</div>` : ''}<h3 class="h3">${esc(title)}</h3><div class="meta">${meta}</div></div>
  </a>`;
}
const fotosLabel = (_, n) => `${n} ${_('photos')}`;
function albumCards(lang, _, alben, withYear = false) {
  return `<div class="gal-grid">${alben.map((a) => galCard(lang, _, {
    href: a.path, cover: a.cover, kicker: withYear ? a.jahr : '', title: a.strecke,
    meta: `${a.datum ? `<span>${formatDate(a.datum, lang)}</span>` : ''}<span>${a.bilder.length ? fotosLabel(_, a.bilder.length) : _('gal_soon')}</span>`
  })).join('')}</div>`;
}

export function galerie(lang, ctx) {
  const _ = t(lang);
  const serien = ctx.content.serien;
  const card = (se) => galCard(lang, _, {
    href: se.path, cover: se.cover, kicker: se.jahre.map((j) => j.jahr).join(' · '), title: se.name,
    meta: `<span>${se.alben.length} ${se.slug === 'hinter-den-kulissen' ? (se.alben.length === 1 ? _('gal_album') : _('gal_albums')) : (se.alben.length === 1 ? _('gal_race') : _('gal_races'))}</span><span>${se.fotos ? fotosLabel(_, se.fotos) : _('gal_soon')}</span>`
  });
  // „Hinter den Kulissen“ steht ganz oben, darunter – getrennt durch die Farblinie – die Meisterschafts-Serien
  const kulissen = serien.filter((se) => se.slug === 'hinter-den-kulissen');
  const rennserien = serien.filter((se) => se.slug !== 'hinter-den-kulissen');
  const grid = serien.length ? `
    ${kulissen.length ? `<div class="gal-grid">${kulissen.map(card).join('')}</div>` : ''}
    ${kulissen.length && rennserien.length ? '<div class="gal-divider" role="separator" aria-hidden="true"></div>' : ''}
    ${rennserien.length ? `<div class="gal-grid">${rennserien.map(card).join('')}</div>` : ''}` : `<p class="muted">${_('gal_empty')}</p>`;
  const body = `${pageHead(_('gal_kicker'), _('nav_galerie'), `<p class="lead">${_('gal_intro')}</p>`)}<section class="wrap section">${grid}</section>`;
  return layout({ lang, path: '/galerie/', title: _('nav_galerie'), body, ctx, active: '/galerie/' });
}

export function galerieSerie(lang, ctx, serie) {
  const _ = t(lang);
  const years = serie.jahre.map((j) => `
<section class="wrap section">
  <div class="section-head"><h2 class="h2 xl"><a class="plain" href="${url(lang, j.path)}">${esc(j.jahr)}</a></h2></div>
  ${albumCards(lang, _, j.alben)}
</section>`).join('');
  const body = `<section class="wrap page-head">${galCrumbs(lang, _, [[serie.name, serie.path]])}<div class="eyebrow">${_('nav_galerie')}</div><h1 class="h1">${esc(serie.name)}</h1></section>${years}`;
  return layout({ lang, path: serie.path, title: `${serie.name} · ${_('nav_galerie')}`, body, ctx, active: '/galerie/' });
}

export function galerieJahr(lang, ctx, serie, jahr) {
  const _ = t(lang);
  const body = `<section class="wrap page-head">${galCrumbs(lang, _, [[serie.name, serie.path], [jahr.jahr, jahr.path]])}<div class="eyebrow">${esc(serie.name)}</div><h1 class="h1">${esc(jahr.jahr)}</h1></section>
<section class="wrap section">${albumCards(lang, _, jahr.alben)}</section>`;
  return layout({ lang, path: jahr.path, title: `${serie.name} ${jahr.jahr} · ${_('nav_galerie')}`, body, ctx, active: '/galerie/' });
}

export function galerieAlbum(lang, ctx, a) {
  const _ = t(lang);
  const c = ctx.content;
  const counts = { strecke: 0, fahrerlager: 0 };
  a.bilder.forEach((b) => { counts[b.kategorie] = (counts[b.kategorie] || 0) + 1; });
  const credits = [...new Set(a.bilder.map((b) => b.fotograf).filter(Boolean))];
  const serie = c.serien.find((s) => s.slug === a.serieSlug);
  const top = a.parent || a;
  const siblings = serie ? serie.alben.filter((x) => x !== top).slice(0, 3) : [];
  const name = a.parent ? `${a.strecke} – ${a.unteralbum}` : a.strecke;
  const crumbs = [[a.serie, `/galerie/${a.serieSlug}/`], [a.jahr, `/galerie/${a.serieSlug}/${a.jahr}/`], [a.strecke, top.path]];
  if (a.parent) crumbs.push([a.unteralbum, a.path]);
  const subs = a.parent ? [a.parent, ...a.parent.unteralben.filter((x) => x !== a)] : a.unteralben;
  const subCards = subs.length ? `<div class="gal-grid mb-s">${subs.map((x) => galCard(lang, _, {
    href: x.path, cover: x.cover, kicker: x.parent ? a.strecke : '', title: x.parent ? x.unteralbum : x.strecke,
    meta: `<span>${x.bilder.length ? fotosLabel(_, x.bilder.length) : _('gal_soon')}</span>`
  })).join('')}</div>` : '';
  const body = `
<section class="wrap page-head">${galCrumbs(lang, _, crumbs)}
  <div class="eyebrow">${esc(a.serie)} · ${esc(a.jahr)}</div><h1 class="h1">${esc(name)}</h1>
  ${a.datum ? `<p class="muted">${formatDate(a.datum, lang)}${a.bilder.length ? ` · ${fotosLabel(_, a.bilder.length)}` : ''}</p>` : ''}
</section>
${subCards ? `<section class="wrap section"><div class="section-head"><h2 class="h2">${_('gal_subalbums')}</h2></div>${subCards}</section>` : ''}
<section class="wrap section" data-gallery>
  <div class="pill-row mb-s"${a.bilder.length ? '' : ' hidden'}>
    <button type="button" class="pill is-active" data-gfilter="all" aria-pressed="true">${_('all')} (${a.bilder.length})</button>
    <button type="button" class="pill" data-gfilter="strecke" aria-pressed="false">${_('cat_strecke')} (${counts.strecke || 0})</button>
    <button type="button" class="pill" data-gfilter="fahrerlager" aria-pressed="false">${_('cat_fahrerlager')} (${counts.fahrerlager || 0})</button>
  </div>
  ${a.bilder.length ? '' : `<p class="muted">${_('gal_soon_long')}</p>`}
  <div class="masonry" data-lightbox-group>
    ${a.bilder.map((b, i) => {
      const isVideo = /\.(mp4|webm|mov)$/i.test(b.bild);
      return `<button type="button" class="masonry-item" data-cat="${esc(b.kategorie)}" data-lightbox-index="${i}" data-full="${esc(isVideo ? b.bild : img(b.bild, 1800))}" data-video="${isVideo}" data-caption="${esc(b.text || '')}${b.fotograf ? ` · ${_('photo_credit')}: ${esc(b.fotograf)}` : ''}" aria-label="${_('enlarge')}: ${esc(b.text || '')}">
        ${isVideo ? `<video src="${esc(b.bild)}" muted playsinline preload="metadata"></video>` : picture(b.bild, b.text || '', { width: 700, sizes: '(max-width: 760px) 100vw, 33vw' })}
      </button>`;
    }).join('')}
  </div>
  ${credits.length ? `<p class="muted small">${_('photo_credit')}: ${credits.map(esc).join(', ')}</p>` : ''}
  <p class="muted small">${_('more_insta')}: <a href="${esc(c.site.instagram)}" rel="noopener" target="_blank">${esc(c.site.instagram_handle)}</a></p>
</section>
${siblings.length ? `<section class="wrap section"><div class="section-head"><h2 class="h2">${_('gal_more')} ${esc(a.serie)}</h2></div>${albumCards(lang, _, siblings, true)}</section>` : ''}
${lightbox(lang)}`;
  return layout({ lang, path: a.path, title: `${name} ${a.jahr} · ${a.serie}`, body, ctx, active: '/galerie/' });
}

function lightbox(lang) {
  const _ = t(lang);
  return `
<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="${_('photos')}" hidden>
  <button type="button" class="lb-close" data-lb-close aria-label="${_('close')}">${icon.close}</button>
  <figure class="lb-figure"><img data-lb-img alt=""><video data-lb-video controls playsinline hidden></video><figcaption data-lb-caption></figcaption></figure>
  <div class="lb-nav">
    <button type="button" data-lb-prev aria-label="${_('prev')}">${icon.prev}</button>
    <span data-lb-pos></span>
    <button type="button" data-lb-next aria-label="${_('next')}">${icon.next}</button>
  </div>
</div>`;
}

/* ---------------- PARTNER ---------------- */
export function partner(lang, ctx, wall) {
  const _ = t(lang);
  const c = ctx.content;
  const tx = c.texte(lang);
  const ds = url(lang, '/datenschutz/');
  const pk = c.pakete;
  const body = `
<section class="partner-hero">
  ${picture(c.site.partner_bild, '', { width: 1800, cls: 'cta-bg', eager: true })}
  <div class="wrap partner-hero-inner">
    <div class="eyebrow gold">${_('partner_kicker')}</div>
    <h1 class="h1 big light">${esc(tx.sponsor_aufruf).replace('#LBC3', '<span class="gold">#LBC3</span>')}</h1>
    <p class="lead light">${esc(tx.partner_intro)}</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="#sponsoren">${_('btn_sponsor')}</a>
      <a class="btn btn-ghost-light" href="${url(lang, '/squadra-tre/')}">${_('btn_squadra')}</a>
    </div>
  </div>
</section>

<section class="wrap section">
  <h2 class="h2">${_('two_ways')}</h2>
  <div class="grid-2">
    <div class="card way way-dark">
      <div class="eyebrow muted">${_('for_companies')}</div>
      <h3 class="h2">${_('sponsors')}</h3>
      <p>${_('sponsors_lead')}</p>
      <ul class="lines"><li>${_('sp_b1')}</li><li>${_('sp_b2')}</li><li>${_('sp_b3')}</li><li><strong>${_('sp_b4')}</strong></li></ul>
      <a class="btn btn-dark" href="#sponsoren">${_('show_packages')}</a>
    </div>
    <div class="card way way-red">
      <div class="eyebrow muted">${_('for_fans')}</div>
      <h3 class="h2">Squadra <span class="red">3</span></h3>
      <p>${_('squadra_lead')}</p>
      <ul class="lines"><li>${_('sq_b1')}</li><li>${_('sq_b2')}</li><li>${_('sq_b3')}</li><li><strong>${_('sq_b4')}</strong></li></ul>
      <a class="btn btn-red" href="${url(lang, '/squadra-tre/')}">${_('join_now')}</a>
    </div>
  </div>
</section>

<section class="wrap section" id="sponsoren">
  <div class="section-head">
    <h2 class="h2">${_('packages')}</h2>
    ${c.site.sponsorenmappe_pdf
      ? `<a class="btn btn-outline" href="${esc(c.site.sponsorenmappe_pdf)}" download>${_('request_kit')} (PDF)</a>`
      : `<a class="btn btn-outline" href="${url(lang, '/kontakt/?anliegen=mappe')}">${_('request_kit')}</a>`}
  </div>
  <div class="grid-3">
    ${pk.map((p, i) => `
    <div class="package${i === 0 ? ' is-top' : ''}">
      <div class="package-name">${esc(p.name)}</div>
      <ul>${(p.leistungen || []).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="package-price">${esc(p.preis || '')}</div>
    </div>`).join('')}
  </div>
  <div class="two-col ad-spaces">
    ${picture('/uploads/ampfing-2026/frontal-aus-der-kurve.jpg', 'Kart von vorne mit Werbeflächen', { width: 1000, sizes: '(max-width: 760px) 100vw, 50vw', cls: 'rounded' })}
    <div>
      <h3 class="h2">${_('ad_spaces')}</h3>
      <ul class="lines strong">${['ad1', 'ad2', 'ad3', 'ad4', 'ad5'].map((k) => `<li>${_(k)}</li>`).join('')}</ul>
    </div>
  </div>
  <h3 class="h2 mt">${_('our_sponsors')}</h3>
  <div class="logo-grid">
    ${c.sponsoren.map((s) => `
    <${s.website ? `a href="${esc(s.website)}" rel="noopener" target="_blank"` : 'div'} class="logo-box">
      ${s.logo ? `<img src="${esc(img(s.logo, 600))}" alt="${esc(s.firma)}" loading="lazy">` : `<span>${esc(s.firma)}</span>`}
      <small>${esc(s.paket || '')}</small>
    </${s.website ? 'a' : 'div'}>`).join('')}
    <a class="logo-box is-cta" href="${url(lang, '/kontakt/?anliegen=sponsoring')}">${_('your_logo')}</a>
  </div>
</section>

${sponsorWall(lang, wall)}

<section class="wrap section">
  <details class="fold">
    <summary><span class="eyebrow">${_('transparency')}</span><span class="h2">${_('transparency_title')}</span><span class="fold-icon" aria-hidden="true">+</span></summary>
    <div class="grid-3 steps">
      <div class="card"><div class="step-num">01</div><h3 class="h3">${_('tr1_t')}</h3><p>${_('tr1')}</p></div>
      <div class="card"><div class="step-num">02</div><h3 class="h3">${_('tr2_t')}</h3><p>${_('tr2')}</p></div>
      <div class="card"><div class="step-num">03</div><h3 class="h3">${_('tr3_t')}</h3><p>${_('tr3')}</p></div>
    </div>
  </details>
  <a class="btn btn-dark" href="/login/">${icon.lock}<span>${_('login_sponsors')}</span></a>
</section>`;
  return layout({ lang, path: '/partner/', title: _('nav_partner'), body, ctx, active: '/partner/', sponsorBanner: false });
}

/* ---------------- KONTAKT ---------------- */
export function kontakt(lang, ctx) {
  const _ = t(lang);
  const c = ctx.content;
  const ds = url(lang, '/datenschutz/');
  const body = `
<section class="wrap two-col section contact">
  <div>
    <div class="eyebrow">${_('kontakt_kicker')}</div>
    <h1 class="h1 big">${_('kontakt_title')}</h1>
    <p class="lead">${esc(c.texte(lang).kontakt_intro)}</p>
    <p class="contact-links"><a href="mailto:${esc(c.site.kontakt_email)}">${esc(c.site.kontakt_email)}</a><br><a href="${esc(c.site.instagram)}" rel="noopener" target="_blank">Instagram ${esc(c.site.instagram_handle)} · #LBC3</a></p>
    ${picture(c.site.off_track_bild, 'Luigi prüft konzentriert sein Kart', { width: 900, cls: 'rounded' })}
  </div>
  <div class="card form-card">
    <form class="form" name="kontakt" method="POST" action="${url(lang, '/danke/')}" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="kontakt">
      <input type="hidden" name="sprache" value="${lang}">
      <p class="hp" aria-hidden="true"><label>Nicht ausfüllen <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <h2 class="h2">${_('write_msg')}</h2>
      <label class="field"><span>${_('f_name')}</span><input name="name" required autocomplete="name"></label>
      <label class="field"><span>${_('f_email')}</span><input name="email" type="email" required autocomplete="email"></label>
      <label class="field"><span>${_('f_company')}</span><input name="firma" autocomplete="organization"></label>
      <label class="field"><span>${_('f_topic')}</span>
        <select name="anliegen" data-topic>
          <option value="sponsoring">${_('topic1')}</option><option value="mappe">${_('topic2')}</option><option value="presse">${_('topic3')}</option><option value="sonstiges">${_('topic4')}</option>
        </select>
      </label>
      <label class="field"><span>${_('f_message')}</span><textarea name="nachricht" rows="6" required></textarea></label>
      <label class="check"><input type="checkbox" name="datenschutz" value="ja" required><span>${_('f_privacy').replace('{ds}', ds)}</span></label>
      <button class="btn btn-red btn-block" type="submit">${_('send')}</button>
    </form>
  </div>
</section>`;
  return layout({ lang, path: '/kontakt/', title: _('nav_kontakt'), body, ctx, active: '/kontakt/' });
}

/* ---------------- RECHTLICHES & HINWEISSEITEN ---------------- */
export function rechtliches(lang, ctx, which) {
  const _ = t(lang);
  const text = which === 'impressum' ? ctx.content.site.impressum : ctx.content.site.datenschutz;
  const body = `${pageHead('LBC3', _(which))}<section class="wrap section"><div class="prose card">${markdown(text)}</div></section>`;
  return layout({ lang, path: `/${which}/`, title: _(which), body, ctx });
}

export function message(lang, ctx, { path, titleKey, textKey, noindex = true }) {
  const _ = t(lang);
  const body = `<section class="wrap section message"><div class="card"><h1 class="h1">${_(titleKey)}</h1><p class="lead">${_(textKey)}</p><a class="btn btn-dark" href="${url(lang, '/')}">${_('back_home')}</a></div></section>`;
  return layout({ lang, path, title: _(titleKey), body, ctx, noindex });
}
