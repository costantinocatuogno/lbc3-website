import { esc, picture, icon, flagsDE, flagsIT, img } from '../lib/html.mjs';
import { url, t, LANGS } from '../lib/i18n.mjs';
import { layout } from './layout.mjs';
import { countdownCard } from './parts.mjs';

export function home(lang, ctx) {
  const _ = t(lang);
  const c = ctx.content;
  const site = c.site;
  const tx = c.texte(lang);
  const album = c.alben.find((a) => a.startseite) || c.alben[0];
  const preview = (album?.bilder || []).slice(0, 4);
  const highlights = c.highlights.slice(0, 8);

  const tagWords = ['#LBC3', _('kicker'), '#LBC3', _('ticker_goal'), '#LBC3', 'Deutschland · Italia', '#LBC3', 'ADAC Kart Masters'];
  const tags = [...tagWords, ...tagWords]
    .map((w, i) => `<span class="${w === '#LBC3' ? 'gold' : ''}"${i >= tagWords.length ? ' aria-hidden="true"' : ''}>${esc(w)}</span>`).join('');

  const body = `
<div class="intro" data-intro hidden>
  <video data-intro-video src="${esc(site.intro_video)}" muted playsinline preload="auto"></video>
  <button type="button" class="btn btn-light intro-skip" data-intro-skip>${_('intro_skip')}</button>
</div>

<section class="hero wrap">
  <div class="hero-bg3" aria-hidden="true">3</div>
  <div class="hero-text">
    <div class="kicker-row">${flagsDE()}<span class="kicker">#LBC3 · ${_('kicker')}</span>${flagsIT()}</div>
    <h1 class="hero-title">Luigi<br>Battista<br><span class="red">Catuogno</span></h1>
    <p class="lead">${esc(tx.hero_text)}</p>
    <div class="btn-row">
      <a class="btn btn-dark" href="${url(lang, '/ueber-luigi/')}">${_('btn_story')}</a>
      <a class="btn btn-outline" href="${url(lang, '/partner/')}">${_('btn_partner')}</a>
    </div>
  </div>
  <div class="hero-side">
    <div class="helmet-card">
      <img class="helmet-watermark" src="/assets/img/lbc3-logo.png" alt="" aria-hidden="true">
      <img class="helmet-img" src="${esc(img(site.helm_bild, 640))}" alt="${_('alt_helm')}" width="420" height="420" fetchpriority="high">
      <span class="helmet-tag">#LBC3</span>
      <span class="helmet-3" aria-hidden="true">3</span>
    </div>
    ${countdownCard(lang, ctx, { compact: true })}
  </div>
</section>

<section class="ticker" aria-label="#LBC3">
  <div class="ticker-track">${tags}</div>
</section>

${site.story_video ? `
<section class="section wrap story">
  <div class="story-text">
    <div class="eyebrow">${_('story_kicker')}</div>
    <h2 class="h1">${_('story_title')}</h2>
    <p class="lead">${_('story_text')}</p>
    <a class="btn btn-dark" href="${url(lang, '/ueber-luigi/')}">${_('story_more')}</a>
  </div>
  <figure class="story-video">
    <video data-story-video src="${esc(site.story_video)}"${site.story_vorschau ? ` poster="${esc(site.story_vorschau)}"` : ''} controls playsinline preload="none"></video>
    <figcaption><button type="button" class="link-btn" data-fullscreen>⛶ ${_('fullscreen')}</button></figcaption>
  </figure>
</section>` : ''}

${highlights.length ? `
<section class="section wrap" data-carousel>
  <div class="section-head">
    <div><div class="eyebrow">${_('highlights')}</div><h2 class="h2">${_('highlights_title')}</h2></div>
    <div class="head-actions">
      <a class="link" href="${url(lang, '/news/')}">${_('all_news')}</a>
      <button type="button" class="square-btn" data-carousel-prev aria-label="${_('prev')}">${icon.prev}</button>
      <button type="button" class="square-btn dark" data-carousel-next aria-label="${_('next')}">${icon.next}</button>
    </div>
  </div>
  <div class="carousel" data-carousel-track tabindex="0">
    ${highlights.map((n, i) => `
    <a class="hl-card" href="${url(lang, `/news/${n.slug}/`)}">
      ${picture(n.vorschaubild || n.titelbild, n.titel, { width: 800, sizes: '(max-width: 760px) 90vw, 33vw' })}
      <div class="hl-body"><span class="hl-num">${String(i + 1).padStart(2, '0')}</span><span class="hl-title">${esc(n.titel)}</span></div>
    </a>`).join('')}
  </div>
</section>` : ''}

<section class="wrap tiles">
  <a class="tile" href="${url(lang, '/kalender/')}">
    ${picture(site.on_track_bild, '', { width: 1000, sizes: '(max-width: 760px) 100vw, 50vw' })}
    <span class="tile-path">/on-track</span>
    <span class="tile-body"><span class="tile-title">On<br><span class="gold">Track</span></span><span class="tile-text">${_('on_track_text')}</span></span>
  </a>
  <a class="tile" href="${url(lang, '/ueber-luigi/')}">
    ${picture(site.off_track_bild, '', { width: 1000, sizes: '(max-width: 760px) 100vw, 50vw' })}
    <span class="tile-path">/off-track</span>
    <span class="tile-body"><span class="tile-title">Off<br><span class="gold">Track</span></span><span class="tile-text">${_('off_track_text')}</span></span>
  </a>
</section>

<section class="band-white">
  <div class="wrap stats">
    <div class="stat"><div class="stat-num">${c.stats.rennen}</div><div class="stat-label">${_('stat_races')}</div></div>
    <div class="stat"><div class="stat-num">${c.stats.podien}</div><div class="stat-label">${_('stat_podiums')}</div></div>
    <div class="stat"><div class="stat-num">${c.stats.siege}</div><div class="stat-label">${_('stat_wins')}</div></div>
    <div class="stat"><div class="stat-num">${c.stats.laender}</div><div class="stat-label">${_('stat_countries')}</div></div>
  </div>
</section>

${album ? `
<section class="section wrap">
  <div class="section-head">
    <h2 class="h2">${esc(album.titel)}</h2>
    <a class="link" href="${url(lang, '/galerie/')}">${_('to_gallery')} ${icon.arrow}</a>
  </div>
  <div class="grid-4">
    ${preview.map((p) => `<a class="square-photo" href="${url(lang, album?.path || '/galerie/')}">${picture(p.bild, p.text, { width: 600, sizes: '(max-width: 760px) 50vw, 25vw' })}</a>`).join('')}
  </div>
</section>` : ''}

<section class="wrap section cta-row">
  <h2 class="h2">${_('next_chapter')}</h2>
  <div class="btn-row">
    <a class="btn btn-red" href="${url(lang, '/partner/')}">${_('btn_partner')}</a>
    <a class="btn btn-outline" href="${url(lang, '/squadra-tre/')}">${_('btn_squadra')}</a>
  </div>
</section>

`;

  return layout({
    lang, path: '/', body, ctx, showReplay: true, bodyClass: 'page-home',
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'Person', '@id': `${ctx.siteUrl}/#luigi`,
        name: 'Luigi Battista Catuogno', alternateName: ['LBC3', 'Luigi Catuogno'],
        jobTitle: _('kartfahrer'), description: ctx.content.texte(lang).hero_text,
        url: ctx.siteUrl, image: `${ctx.siteUrl}/assets/img/og-lbc3.jpg`,
        nationality: [{ '@type': 'Country', name: 'Germany' }, { '@type': 'Country', name: 'Italy' }],
        knowsLanguage: ['de', 'it'],
        memberOf: { '@type': 'SportsTeam', name: ctx.content.fahrerFor(lang).team || '7L Performance', sport: 'Karting', url: ctx.content.fahrerFor(lang).team_link || undefined },
        award: (site.auszeichnungen || []).filter(Boolean),
        sameAs: [site.instagram, site.tiktok, site.youtube, ...(site.weitere_profile || [])].filter(Boolean)
      },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'LBC3 · Luigi Battista Catuogno', url: ctx.siteUrl, inLanguage: LANGS }
    ]
  });
}
