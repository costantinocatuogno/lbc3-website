// „Bald geht's los“-Seite: wird allen Besuchern gezeigt, solange in den Einstellungen
// „Bald-Modus“ aktiv ist. Das Team sieht die echte Website über /vorschau/ (setzt ein Cookie).
import { esc } from '../lib/html.mjs';

const kart = `
<svg class="kart" viewBox="0 0 260 120" role="img" aria-label="Gokart mit der Nummer 3">
  <g class="kart-body">
    <!-- Heckspoiler / Stoßfänger -->
    <rect x="14" y="70" width="22" height="18" rx="4" fill="#1b1e24"/>
    <rect x="10" y="74" width="8" height="10" rx="2" fill="#B00E28"/>
    <!-- Seitenkasten -->
    <path d="M44 74 h112 l10 10 h-128 z" fill="#2aa7e0"/>
    <path d="M60 78 h40 l-4 6 h-40 z" fill="#E3B23C"/>
    <text x="112" y="84" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="900" font-size="12" fill="#121418">533</text>
    <!-- Rahmen -->
    <rect x="30" y="86" width="190" height="5" rx="2.5" fill="#22252B"/>
    <!-- Frontverkleidung -->
    <path d="M176 66 q34 0 56 22 l-4 6 h-58 z" fill="#2aa7e0"/>
    <path d="M196 72 q18 4 30 18 l-10 0 q-10 -10 -22 -14 z" fill="#ffffff" opacity=".85"/>
    <!-- Motor -->
    <rect x="50" y="56" width="26" height="20" rx="3" fill="#8a9099"/>
    <rect x="54" y="52" width="18" height="6" rx="2" fill="#5c626b"/>
    <!-- Fahrer: Körper -->
    <path d="M86 78 q2 -26 22 -30 h12 q10 2 10 14 l-4 16 z" fill="#f4f4f4"/>
    <path d="M112 60 q24 2 44 12 l-2 6 q-20 -6 -40 -8 z" fill="#f4f4f4"/>
    <path d="M150 70 l18 -6 l3 5 l-17 8 z" fill="#B00E28"/>
    <!-- Lenkrad -->
    <path d="M160 52 l8 22" stroke="#22252B" stroke-width="5" stroke-linecap="round"/>
    <path d="M157 50 l6 -4" stroke="#E86A1C" stroke-width="5" stroke-linecap="round"/>
    <!-- Helm -->
    <circle cx="112" cy="36" r="18" fill="#121418"/>
    <path d="M100 26 q14 -10 28 2" stroke="#E3B23C" stroke-width="2.5" fill="none"/>
    <path d="M104 46 q12 4 24 -2" stroke="#E3B23C" stroke-width="2" fill="none"/>
    <path d="M114 30 h14 q4 4 2 10 h-16 z" fill="#7b4dff"/>
    <path d="M116 31 h10" stroke="#c9b8ff" stroke-width="1.5"/>
    <text x="98" y="44" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="900" font-size="13" fill="#E3B23C">3</text>
    <path d="M100 20 h8 v3 h-8 z" fill="#1E8E3E"/><path d="M108 19 h7 v3 h-7 z" fill="#ffffff"/><path d="M115 19 h7 v3 h-7 z" fill="#C8102E"/>
  </g>
  <!-- Räder -->
  <g class="wheel" style="transform-origin:58px 94px"><circle cx="58" cy="94" r="17" fill="#121418"/><circle cx="58" cy="94" r="8" fill="#c9971f"/><rect x="56" y="80" width="4" height="10" fill="#33363c"/></g>
  <g class="wheel" style="transform-origin:198px 98px"><circle cx="198" cy="98" r="13" fill="#121418"/><circle cx="198" cy="98" r="6" fill="#c9971f"/><rect x="196" y="87" width="4" height="8" fill="#33363c"/></g>
</svg>`;

function berlinIso(local) {
  // „2026-10-31T18:00“ (deutsche Zeit) → exakter Zeitpunkt mit Zeitzonen-Versatz
  const m = String(local || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return '';
  const [y, mo, d, h = '00', mi = '00'] = m.slice(1);
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
  const g = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asBerlin = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
  return new Date(guess - (asBerlin - guess)).toISOString();
}

export function baldPage(ctx) {
  const site = ctx.content.site;
  const ziel = berlinIso(site.start_datum || '2026-10-31T18:00');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LBC3 · Luigi Battista Catuogno – bald geht's los</title>
<meta name="description" content="Die neue Website von Luigi Battista Catuogno (#3) ist fast fertig – komm Ende Oktober wieder!">
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/img/favicon.png">
<style>
@font-face { font-family: 'Barlow Condensed'; font-weight: 900; font-display: swap; src: url('/fonts/barlow-condensed-latin-900-normal.woff2') format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 500; font-display: swap; src: url('/fonts/manrope-latin-500-normal.woff2') format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 700; font-display: swap; src: url('/fonts/manrope-latin-700-normal.woff2') format('woff2'); }
:root { --ink:#121418; --gold:#E3B23C; --red:#B00E28; --light:#DADDE2; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: radial-gradient(120% 90% at 50% 0%, #22252B 0%, var(--ink) 60%); color: #fff; font-family: 'Manrope', system-ui, sans-serif;
  min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 16px 24px; gap: 22px; }
.logo { width: 76px; height: auto; opacity: .95; }
.eyebrow { font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: 13px; color: var(--gold); }
h1 { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 900; text-transform: uppercase; line-height: .9; margin: 0;
  font-size: clamp(48px, 11vw, 132px); letter-spacing: .5px; }
h1 span { color: var(--gold); }
.sub { font-size: clamp(18px, 2.6vw, 24px); font-weight: 700; margin: 0; }
.langs { color: var(--light); opacity: .75; font-size: 15px; margin: 0; max-width: 560px; line-height: 1.6; }
.track { position: relative; width: 100%; height: 190px; margin-top: 8px; overflow: hidden; }
.road { position: absolute; left: 0; right: 0; bottom: 18px; height: 3px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 34px, transparent 34px 64px); }
.kerb { position: absolute; left: 0; right: 0; bottom: 6px; height: 8px; background: repeating-linear-gradient(90deg, var(--red) 0 28px, #fff 28px 56px); opacity: .85; }
.kart { position: absolute; bottom: 14px; left: 50%; width: min(320px, 78vw); margin-left: calc(min(320px, 78vw) / -2); animation: drive 6s cubic-bezier(.55,0,.75,.2) infinite; }
.kart-body { animation: idle .12s linear infinite alternate; }
.wheel { animation: spin .35s linear infinite; }
.lines { position: absolute; bottom: 40px; left: 50%; width: 120px; margin-left: -240px; height: 60px; opacity: 0; animation: lines 6s infinite; }
.lines i { display: block; height: 3px; margin: 10px 0; border-radius: 3px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.7)); }
.lines i:nth-child(2) { width: 70%; margin-left: 30%; } .lines i:nth-child(3) { width: 85%; margin-left: 15%; }
.puff { position: absolute; bottom: 34px; left: 50%; margin-left: -128px; width: 22px; height: 22px; border-radius: 50%; background: rgba(220,220,220,.5); filter: blur(2px); opacity: 0; animation: puff 6s infinite; }
.puff.p2 { animation-delay: .25s; width: 16px; height: 16px; } .puff.p3 { animation-delay: .5s; width: 12px; height: 12px; }
@keyframes drive { 0%, 30% { transform: translateX(0); } 75% { transform: translateX(110vw); } 75.01% { transform: translateX(-110vw); } 100% { transform: translateX(0); } }
@keyframes idle { from { transform: translateY(0); } to { transform: translateY(1px); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes lines { 0%, 32% { opacity: 0; transform: translateX(0); } 40% { opacity: 1; } 60% { opacity: 0; transform: translateX(-60px); } 100% { opacity: 0; } }
@keyframes puff { 0%, 12% { opacity: 0; transform: translate(0,0) scale(.6); } 20% { opacity: .8; } 34% { opacity: 0; transform: translate(-60px,-24px) scale(2.2); } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .kart, .kart-body, .wheel, .lines, .puff { animation: none; } }
.cd { display: flex; gap: clamp(8px, 2vw, 16px); justify-content: center; margin-top: 4px; }
.cd div { min-width: clamp(64px, 16vw, 96px); padding: 12px 8px 10px; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
.cd b { display: block; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 900; font-size: clamp(34px, 7vw, 56px); line-height: 1; color: var(--gold); font-variant-numeric: tabular-nums; }
.cd span { display: block; margin-top: 6px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--light); }
.cd-done { font-weight: 700; color: var(--gold); font-size: 20px; }
footer .team { opacity: .7; }
.btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 22px; border-radius: 999px; background: var(--gold); color: var(--ink); font-weight: 700; text-decoration: none; }
.btn:hover { background: #f0c24d; }
footer { text-align: center; padding: 18px 16px 26px; color: var(--light); font-size: 14px; opacity: .8; }
footer a { color: var(--light); }
.flag { display: flex; height: 5px; } .flag i { flex: 1; }
</style>
</head>
<body>
<main>
  <img class="logo" src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="76" height="95">
  <div class="eyebrow">Luigi Battista Catuogno · #3</div>
  <h1>Wir sind fast<br><span>am Ziel …</span></h1>
  <p class="sub">Komm Ende Oktober wieder!</p>
  ${ziel ? `<div class="cd" data-ziel="${ziel}" aria-label="Countdown bis zum Start">
    <div><b data-t="d">–</b><span>Tage</span></div><div><b data-t="h">–</b><span>Std</span></div><div><b data-t="m">–</b><span>Min</span></div><div><b data-t="s">–</b><span>Sek</span></div>
  </div>` : ''}
  <p class="langs">Quasi al traguardo … torna a fine ottobre! · Almost at the finish line … come back at the end of October!</p>
  <div class="track" aria-hidden="true">
    <div class="lines"><i></i><i></i><i></i></div>
    <span class="puff"></span><span class="puff p2"></span><span class="puff p3"></span>
    ${kart}
    <div class="road"></div><div class="kerb"></div>
  </div>
  <a class="btn" href="${esc(site.instagram)}" rel="noopener" target="_blank">Bis dahin auf Instagram: ${esc(site.instagram_handle)}</a>
</main>
<footer>
  <a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a> · <a href="mailto:${esc(site.kontakt_email)}">${esc(site.kontakt_email)}</a><br>
  © ${new Date().getFullYear()} LBC3 · Luigi Battista Catuogno · <a class="team" href="/login/">Team-Login</a>
</footer>
<script src="/bald/bald.js" defer></script>
<div class="flag" aria-hidden="true"><i style="background:#000"></i><i style="background:#C8102E"></i><i style="background:#E0B000"></i><i style="background:transparent"></i><i style="background:#1E8E3E"></i><i style="background:#F2F3F5"></i><i style="background:#C8102E"></i></div>
</body>
</html>`;
}

// Vorschau-Schalter für das Team: setzt bzw. löscht das Cookie, mit dem die echte Website sichtbar ist.
export function vorschauPage() {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vorschau · LBC3</title><meta name="robots" content="noindex">
<style>body{font-family:system-ui,sans-serif;background:#121418;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:16px;margin:0}a{color:#E3B23C}</style>
</head><body><div>
<h1 id="t">Vorschau wird eingeschaltet …</h1>
<p id="m">Einen Moment.</p>
<script src="/vorschau/vorschau.js"></script>
<noscript>Bitte JavaScript einschalten.</noscript>
</div></body></html>`;
}

// Weiterleitungsregeln (Netlify _redirects) für den Bald-Modus
export function baldRedirects() {
  const frei = [
    '/bald/*', '/vorschau/*', '/assets/*', '/fonts/*', '/uploads/*', '/wall/*', '/admin/*',
    '/login/*', '/team/*', '/bericht/*', '/wall-of-fame/*', '/squadra-bestaetigt/*',
    '/impressum/*', '/datenschutz/*', '/en/impressum/*', '/en/datenschutz/*', '/it/impressum/*', '/it/datenschutz/*',
    '/robots.txt', '/favicon.ico'
  ];
  return [
    '# Bald-Modus (Einstellungen → „Bald-Modus“). Ausschalten im CMS, dann ist die Website für alle sichtbar.',
    ...frei.map((p) => `${p}  ${p.endsWith('/*') ? p.replace('/*', '/:splat') : p}  200!`),
    '# Team-Vorschau: wer /vorschau/ besucht hat, sieht die echte Website',
    '/*  /:splat  200  Cookie=lbc3_vorschau',
    '# Alle anderen sehen die Bald-Seite (Adresse bleibt gleich)',
    '/*  /bald/index.html  200!',
    ''
  ].join('\n');
}

export const baldJs = `(function () {
  var el = document.querySelector('.cd'); if (!el) return;
  var ziel = new Date(el.getAttribute('data-ziel')).getTime();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = Math.max(0, ziel - Date.now());
    if (diff === 0) { el.outerHTML = '<p class="cd-done">Gleich geht\u2019s los \u2013 schau gleich nochmal vorbei!</p>'; return; }
    var s = Math.floor(diff / 1000);
    el.querySelector('[data-t=d]').textContent = Math.floor(s / 86400);
    el.querySelector('[data-t=h]').textContent = pad(Math.floor(s % 86400 / 3600));
    el.querySelector('[data-t=m]').textContent = pad(Math.floor(s % 3600 / 60));
    el.querySelector('[data-t=s]').textContent = pad(s % 60);
    setTimeout(tick, 1000);
  }
  tick();
})();
`;

export const vorschauJs = `(function () {
  var aus = /[?&]aus\\b/.test(location.search);
  if (aus) {
    document.cookie = 'lbc3_vorschau=; Max-Age=0; Path=/; Secure; SameSite=Lax';
    document.getElementById('t').textContent = 'Vorschau ausgeschaltet';
    document.getElementById('m').innerHTML = 'Du siehst jetzt wieder die Bald-Seite. <a href="/">Zur Startseite</a>';
  } else {
    document.cookie = 'lbc3_vorschau=1; Max-Age=' + (60 * 60 * 24 * 365) + '; Path=/; Secure; SameSite=Lax';
    var ziel = (location.search.match(/[?&]ziel=([^&]+)/) || [])[1];
    ziel = ziel ? decodeURIComponent(ziel) : '/';
    location.replace(ziel.charAt(0) === '/' && ziel.charAt(1) !== '/' ? ziel : '/');
  }
})();
`;
