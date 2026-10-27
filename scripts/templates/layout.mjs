import { esc, icon, img } from '../lib/html.mjs';
import { LANGS, LANG_NAMES, OG_LOCALE, url, t, ui } from '../lib/i18n.mjs';
import { sponsorMarquee } from './parts.mjs';


const NAV = [
  ['nav_news', '/news/'],
  ['nav_ueber', '/ueber-luigi/'],
  ['nav_kalender', '/kalender/'],
  ['nav_galerie', '/galerie/'],
  ['nav_squadra', '/squadra-tre/'],
  ['nav_partner', '/partner/'],
  ['nav_kontakt', '/kontakt/']
];

export function layout({
  lang = 'de', path = '/', title, description, body, ctx, active = '', bodyClass = '',
  noindex = false, scripts = [], ogImage = '/assets/img/og-lbc3.jpg', showReplay = false, alternates = true, jsonLd = null, sponsorBanner = null, ogType = 'website'
}) {
  const _ = t(lang);
  const site = ctx.content.site;
  const base = ctx.siteUrl;
  const fullTitle = title ? `${title} · LBC3 Luigi Battista Catuogno` : `LBC3 · Luigi Battista Catuogno – ${_('kartfahrer')} #3`;
  const desc = description || ctx.content.texte(lang).hero_text;
  const canonical = `${base}${url(lang, path)}`;
  const hreflang = alternates
    ? LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${base}${url(l, path)}">`).join('\n') +
      `\n<link rel="alternate" hreflang="x-default" href="${base}${path}">`
    : '';

  const langSwitch = alternates
    ? LANGS.map((l) => (l === lang
      ? `<span class="lang is-active" aria-current="true">${l.toUpperCase()}</span>`
      : `<a class="lang" href="${url(l, path)}" hreflang="${l}" lang="${l}" data-set-lang="${l}" title="${LANG_NAMES[l]}">${l.toUpperCase()}</a>`)).join('')
    : '';

  const nav = NAV.map(([key, href]) => {
    const isActive = active === href;
    return `<a href="${url(lang, href)}"${isActive ? ' aria-current="page" class="is-active"' : ''}>${_(key)}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${canonical}">`}
${noindex ? '' : hreflang}
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="${OG_LOCALE[lang] || 'de_DE'}">
<meta property="og:site_name" content="LBC3 · Luigi Battista Catuogno">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${base}${ogImage}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#121418">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="preload" href="/fonts/barlow-condensed-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${ctx.version}">
${(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${_('skip')}</a>
${alternates && !noindex ? langBanner(lang, path) : ''}
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${url(lang, '/')}">
      <img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="40" height="50">
      <span class="brand-text"><strong>LUIGI BATTISTA CATUOGNO</strong><small>${_('kartfahrer')} · #3</small></span>
    </a>
    ${alternates ? `<details class="lang-mini"><summary aria-label="${_('lang_choose')}">${lang.toUpperCase()} <span aria-hidden="true">▾</span></summary><div class="lang-mini-list">${LANGS.map((l) => (l === lang
      ? `<span class="is-active" aria-current="true">${LANG_NAMES[l]}</span>`
      : `<a href="${url(l, path)}" hreflang="${l}" lang="${l}" data-set-lang="${l}">${LANG_NAMES[l]}</a>`)).join('')}</div></details>` : ''}
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="${_('menu')}">${icon.menu}</button>
    <nav id="site-nav" class="site-nav" aria-label="${_('nav_main')}">
      <div class="nav-links">${nav}</div>
      <div class="nav-tools">
        ${langSwitch}
        <a class="icon-btn" href="${esc(site.instagram)}" rel="noopener" target="_blank" aria-label="Instagram ${esc(site.instagram_handle)}">${icon.instagram}</a>
        ${site.tiktok ? `<a class="icon-btn" href="${esc(site.tiktok)}" rel="noopener" target="_blank" aria-label="TikTok ${esc(site.tiktok_handle || '')}">${icon.tiktok}</a>` : ''}
        ${site.youtube ? `<a class="icon-btn" href="${esc(site.youtube)}" rel="noopener" target="_blank" aria-label="YouTube ${esc(site.youtube_handle || '')}">${icon.youtube}</a>` : ''}
        ${showReplay ? `<button class="icon-btn" type="button" data-intro-replay aria-label="${_('intro_replay')}">${icon.play}</button>` : ''}
        <a class="btn btn-outline btn-sm" href="${url(lang, '/login/')}">${icon.lock}<span>${_('login')}</span></a>
      </div>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
${(sponsorBanner ?? !noindex) ? sponsorMarquee(lang, ctx) : ''}
${footer(lang, ctx)}
<script src="/assets/js/site.js?v=${ctx.version}" defer></script>
${scripts.map((s) => `<script src="${s}?v=${ctx.version}" defer></script>`).join('\n')}
</body>
</html>`;
}

// Sprachvorschlag: erscheint nur, wenn Browser-Sprache oder gemerkte Wahl nicht zur Seite passt. Keine Umleitung.
function langBanner(lang, path) {
  const data = Object.fromEntries(LANGS.filter((l) => l !== lang).map((l) => [l, {
    href: url(l, path), text: ui[l].lang_suggest, yes: ui[l].lang_switch, no: ui[l].lang_stay.replace('{lang}', ui[l][`lang_name_${lang}`])
  }]));
  return `<div class="lang-banner" data-lang-banner data-page-lang="${lang}" hidden role="region" aria-label="${esc(ui[lang].lang_choose)}">
  <div class="wrap lang-banner-inner"><p data-lb-text></p><div class="lang-banner-btns"><a class="btn btn-red btn-sm" data-lb-yes href="#"></a><button type="button" class="btn btn-outline btn-sm" data-lb-no></button></div></div>
  <script type="application/json" data-lb-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
</div>`;
}

function footer(lang, ctx) {
  const _ = t(lang);
  const site = ctx.content.site;
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="wrap footer-inner">
    <a href="${url(lang, '/')}" class="footer-logo"><img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="88" height="110" loading="lazy"></a>
    <div class="footer-col">
      ${NAV.slice(0, 4).map(([k, h]) => `<a href="${url(lang, h)}">${_(k)}</a>`).join('')}
    </div>
    <div class="footer-col">
      ${NAV.slice(4).map(([k, h]) => `<a href="${url(lang, h)}">${_(k)}</a>`).join('')}
      <a href="mailto:${esc(site.kontakt_email)}">${esc(site.kontakt_email)}</a>
      <a href="${esc(site.instagram)}" rel="noopener" target="_blank">Instagram ${esc(site.instagram_handle)}</a>
      ${site.tiktok ? `<a href="${esc(site.tiktok)}" rel="noopener" target="_blank">TikTok ${esc(site.tiktok_handle || '')}</a>` : ''}
      ${site.youtube ? `<a href="${esc(site.youtube)}" rel="noopener" target="_blank">YouTube ${esc(site.youtube_handle || '')}</a>` : ''}
      <a href="${url(lang, '/login/')}" class="gold">${_('login_sponsors')}</a>
    </div>
  </div>
  <div class="wrap footer-legal">
    <span>© ${year} LBC3 · Luigi Battista Catuogno. ${_('rights')}</span>
    <span><a href="${url(lang, '/impressum/')}">${_('impressum')}</a> · <a href="${url(lang, '/datenschutz/')}">${_('datenschutz')}</a></span>
  </div>
  <div class="flagbar" aria-hidden="true"><i style="background:#000"></i><i style="background:#C8102E"></i><i style="background:#E0B000"></i><i class="flagbar-gap"></i><i style="background:#1E8E3E"></i><i style="background:#F2F3F5"></i><i style="background:#C8102E"></i></div>
</footer>`;
}

// Für Seiten wie Login/Bericht/Team: eigener, schlanker Rahmen.
export function bareLayout({ title, body, ctx, scripts = [], bodyClass = '', lang = 'de', texts = null }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · LBC3</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#121418">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="stylesheet" href="/assets/css/site.css?v=${ctx.version}">
</head>
<body class="${bodyClass}">
${body}
${texts ? `<script type="application/json" id="lbc3-texte">${JSON.stringify(texts).replace(/</g, '\\u003c')}</script>` : ''}
<script src="/assets/js/config.js?v=${ctx.version}"></script>
<script src="/assets/vendor/supabase.js?v=${ctx.version}"></script>
${scripts.map((s) => `<script src="${s}?v=${ctx.version}" defer></script>`).join('\n')}
</body>
</html>`;
}

export { img };
