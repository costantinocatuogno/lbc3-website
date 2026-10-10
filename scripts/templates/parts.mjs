import { esc, img } from '../lib/html.mjs';
import { url, t, formatDate } from '../lib/i18n.mjs';

// Countdown-Karte. Alle bevorstehenden Rennen werden als JSON mitgegeben;
// das Skript wählt im Browser das nächste Rennen, das noch in der Zukunft liegt.
export function countdownCard(lang, ctx, { compact = false, image = '' } = {}) {
  const _ = t(lang);
  const races = ctx.content.upcoming;
  const first = races[0];
  const data = esc(JSON.stringify(races));
  const card = `
  <div class="countdown${compact ? ' compact' : ''}" data-countdown data-races="${data}" data-lang="${lang}">
    <div class="cd-meta"><span>${_('next_race')}</span><span data-cd-date>${first ? esc(formatDate(first.start, lang)) : ''}</span></div>
    <div class="cd-track" data-cd-track>${first ? esc(first.strecke) : _('no_race')}</div>
    <div class="cd-series" data-cd-series>${first ? esc([first.serie, first.klasse].filter(Boolean).join(' · ')) : ''}</div>
    <div class="cd-grid" role="timer" aria-live="off">
      <div><span data-cd="d">--</span><small>${_('days')}</small></div>
      <div><span data-cd="h">--</span><small>${_('hours')}</small></div>
      <div><span data-cd="m">--</span><small>${_('minutes')}</small></div>
      <div><span data-cd="s">--</span><small>${_('seconds')}</small></div>
    </div>
    ${compact ? `<a class="btn btn-gold btn-block" href="${url(lang, '/kalender/')}">${_('full_calendar')}</a>` : ''}
  </div>`;
  if (!image) return card;
  return `<div class="countdown-wide">${card}<img src="${esc(img(image, 1000))}" alt="" loading="lazy"></div>`;
}

// Animiertes Sponsoren-Laufband (Inhalte doppelt für die Endlosschleife).
export function sponsorMarquee(lang, ctx) {
  const _ = t(lang);
  const list = ctx.content.sponsoren.filter((s) => s.im_laufband !== false);
  const items = [...list.map((s) => ({ ...s })), { firma: _('your_logo'), cta: true }];
  while (items.length < 7) items.push(...items.slice(0, 7 - items.length));
  const cell = (s, hidden) => {
    const inner = s.logo
      ? `<img src="${esc(img(s.logo, 640))}" alt="${esc(s.firma)}" loading="lazy">`
      : `<span>${esc(s.firma)}</span>`;
    const href = s.cta ? url(lang, '/partner/#sponsoren') : s.website;
    const attrs = hidden ? ' aria-hidden="true" tabindex="-1"' : '';
    return href
      ? `<a class="logo-cell${s.cta ? ' is-cta' : ''}" href="${esc(href)}"${s.cta ? '' : ' rel="noopener" target="_blank"'}${attrs}>${inner}</a>`
      : `<div class="logo-cell"${attrs}>${inner}</div>`;
  };
  return `
<section class="marquee-section" aria-label="${_('our_sponsors')}">
  <div class="wrap marquee-head">
    <span class="eyebrow muted">${_('our_sponsors')}</span>
    <a class="link" href="${url(lang, '/squadra-3/')}">${_('squadra_link')}</a>
  </div>
  <div class="marquee"><div class="marquee-track">${items.map((s) => cell(s, false)).join('')}${items.map((s) => cell(s, true)).join('')}</div></div>
</section>`;
}

export function pageHead(kicker, title, extra = '') {
  return `<section class="wrap page-head"><div class="eyebrow">${kicker}</div><h1 class="h1">${title}</h1>${extra}</section>`;
}
