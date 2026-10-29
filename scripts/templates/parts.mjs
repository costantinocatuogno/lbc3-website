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
  // Platzhalter wie „[SPONSOR 1]“ ohne Logo werden nicht gezeigt – stattdessen freie Plätze „Dein Logo hier“.
  const list = ctx.content.sponsoren.filter((s) => s.im_laufband !== false && (s.logo || !/^\s*\[/.test(s.firma || '')));
  // Dazu alle Partner, die ihren Eintrag im Login angelegt haben und vom Team freigegeben wurden (Wall of Fame)
  const known = new Set(list.map((s) => String(s.firma || '').trim().toLowerCase()));
  const wallSp = ctx.wall && !ctx.wall.beispiel ? ctx.wall.sponsoren : [];
  for (const s of wallSp) {
    const key = String(s.firma || '').trim().toLowerCase();
    if (!s.logo || !key || known.has(key)) continue;
    known.add(key);
    list.push({ firma: s.firma, logo: s.logo, website: s.website || '' });
  }
  const items = [...list.map((s) => ({ ...s })), { firma: _('your_logo'), cta: true }];
  // Noch keine echten Sponsoren: freie Plätze (gestrichelt) im Wechsel mit „Dein Logo hier“
  if (!list.length) items.push({ firma: _('free_spot'), cta: true, free: true }, { firma: _('free_spot'), cta: true, free: true });
  while (items.length < 7) items.push(...items.slice(0, 7 - items.length));
  const cell = (s, hidden) => {
    const inner = s.logo
      ? `<img src="${esc(img(s.logo, 640))}" alt="${esc(s.firma)}" loading="lazy">`
      : `<span>${esc(s.firma)}</span>`;
    const href = s.cta ? url(lang, '/partner/#sponsoren') : s.website;
    const attrs = hidden ? ' aria-hidden="true" tabindex="-1"' : '';
    return href
      ? `<a class="logo-cell${s.cta && !s.free ? ' is-cta' : ''}${s.free ? ' is-free' : ''}" href="${esc(href)}"${s.cta ? '' : ' rel="noopener" target="_blank"'}${attrs}>${inner}</a>`
      : `<div class="logo-cell"${attrs}>${inner}</div>`;
  };
  return `
<section class="marquee-section" aria-label="${_('our_sponsors')}">
  <div class="wrap marquee-head">
    <span class="eyebrow muted">${_('our_sponsors')}</span>
    <a class="link" href="${url(lang, '/squadra-tre/')}">${_('squadra_link')}</a>
  </div>
  <div class="marquee"><div class="marquee-track">${items.map((s) => cell(s, false)).join('')}${items.map((s) => cell(s, true)).join('')}</div></div>
</section>`;
}

export function pageHead(kicker, title, extra = '') {
  return `<section class="wrap page-head"><div class="eyebrow">${kicker}</div><h1 class="h1">${title}</h1>${extra}</section>`;
}

// „Neu auf Instagram“: die neuesten Beiträge als Raster (Bilder liegen auf unserem Server, Klick öffnet Instagram)
export function instaGrid(lang, ctx, { limit = 6 } = {}) {
  const posts = (ctx.instagram?.beitraege || []).slice(0, limit);
  if (!posts.length) return '';
  const _ = t(lang);
  const site = ctx.content.site;
  const short = (s) => { const x = String(s || '').split('\n')[0].trim(); return x.length > 90 ? `${x.slice(0, 90).replace(/\s+\S*$/, '')} …` : x; };
  return `
<section class="wrap section insta">
  <div class="section-head">
    <div><div class="eyebrow">${_('insta_kicker')}</div><h2 class="h2">${_('insta_title')}</h2></div>
    <a class="link" href="${esc(site.instagram)}" rel="noopener" target="_blank">${_('sq_follow')} · ${esc(site.instagram_handle)}</a>
  </div>
  <div class="insta-grid">
    ${posts.map((p) => `<a class="insta-item" href="${esc(p.link)}" rel="noopener" target="_blank">
      <img src="${esc(p.bild)}" alt="${esc(short(p.text) || 'Instagram')}" loading="lazy" decoding="async">
      ${p.typ === 'VIDEO' ? '<span class="insta-badge" aria-hidden="true">▶</span>' : ''}
      ${p.text ? `<span class="insta-text" lang="und">${esc(short(p.text))}</span>` : ''}
    </a>`).join('')}
  </div>
  ${lang !== 'de' ? `<p class="muted small">${_('insta_note')}</p>` : ''}
</section>`;
}
