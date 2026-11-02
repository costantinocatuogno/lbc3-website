// Login, Ausgabenbericht (Partner) und Team-Bereich (Admins).
// Diese Seiten enthalten KEINE vertraulichen Daten – alles wird erst nach dem Login
// aus Supabase geladen und dort per Row-Level-Security geschützt.
// Login und Ausgabenbericht gibt es in allen Sprachen (/login/, /it/login/ …); der Team-Bereich ist nur auf Deutsch.
import { esc, icon, img } from '../lib/html.mjs';
import { bareLayout } from './layout.mjs';
import { t, ui, url, LANGS, LANG_NAMES } from '../lib/i18n.mjs';

export const KATEGORIEN = [
  'Reisekosten Deutschland & Italien',
  'Wohnmobil (Anschaffung / Unterhalt)',
  'Kart & Chassis',
  'Motor, Vergaser & Ersatzteile',
  'Reifen',
  'Benzin & Öl',
  'Nenngelder',
  'Team & Betreuung',
  'Verpflegung',
  'Training & Streckengebühren'
];

// Texte für auth.js (Meldungen im Browser) in der Sprache der Seite
function jsTexts(lang) {
  const _ = t(lang);
  const dict = Object.fromEntries(Object.keys(ui.de).filter((k) => k.startsWith('pj_') || k.startsWith('p_hint_')).map((k) => [k, _(k)]));
  dict.kat = Object.fromEntries(KATEGORIEN.map((k, i) => [k, _(`kat_${i + 1}`)]));
  return dict;
}

// Kleiner Sprachumschalter für Login und Bericht
function langLinks(lang, path) {
  return `<span class="app-langs">${LANGS.map((l) => (l === lang
    ? `<strong aria-current="true">${l.toUpperCase()}</strong>`
    : `<a href="${url(l, path)}" hreflang="${l}" lang="${l}" data-set-lang="${l}" title="${LANG_NAMES[l]}">${l.toUpperCase()}</a>`)).join(' ')}</span>`;
}

// Formular für den eigenen Wall-of-Fame-Eintrag (Partner im Login – oder Admin für einen Partner)
function sponsorWallForm(admin = false, lang = 'de') {
  const _ = t(lang);
  return `
<form class="form" data-sw-form>
  <input type="hidden" name="id">
  <div class="grid-2 tight">
    <label class="field"><span>${_('p_sw_company')}</span><input name="firma" required maxlength="120"></label>
    <label class="field"><span>${_('p_sw_contact')}</span><input name="ansprechpartner" maxlength="120"></label>
  </div>
  <label class="field"><span>${_('p_sw_web')}</span><input name="website" inputmode="url" required placeholder="www.firma.de" maxlength="300"></label>
  <p class="muted small">${_('p_sw_social')}</p>
  <div class="grid-2 tight">
    <label class="field"><span>Instagram</span><input name="instagram" placeholder="https://instagram.com/… / @…" maxlength="300"></label>
    <label class="field"><span>Facebook</span><input name="facebook" placeholder="https://facebook.com/…" maxlength="300"></label>
    <label class="field"><span>LinkedIn</span><input name="linkedin" placeholder="https://linkedin.com/company/…" maxlength="300"></label>
    <label class="field"><span>TikTok</span><input name="tiktok" placeholder="https://tiktok.com/@…" maxlength="300"></label>
    <label class="field"><span>YouTube</span><input name="youtube" placeholder="https://youtube.com/@…" maxlength="300"></label>
    ${admin ? '<label class="field"><span>Paket</span><input name="paket" maxlength="60"></label>' : ''}
  </div>
  <label class="field"><span>${_('p_sw_text')}</span><textarea name="text" rows="3" maxlength="280" placeholder="${esc(_('p_sw_text_ph'))}"></textarea></label>
  <div class="photo-pick">
    <div class="photo-preview logo" data-sw-preview>Logo</div>
    <div><span class="field-label">${_('p_sw_logo')}</span>
      <label class="btn btn-outline btn-sm"><input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" data-sw-logo hidden><span>${_('p_sw_logo_btn')}</span></label></div>
  </div>
  <label class="check"><input type="checkbox" name="einwilligung" required><span>${_('p_sw_consent')}</span></label>
  <div class="btn-row"><button class="btn btn-dark" type="submit">${admin ? 'Eintrag speichern' : _('p_sw_save')}</button>${admin ? '<button type="button" class="btn btn-outline" data-sw-reset>Neu</button>' : ''}</div>
</form>`;
}

const topbar = (title, extra = '', lang = 'de', path = '') => {
  const _ = t(lang);
  return `
<header class="app-bar">
  <div class="wrap app-bar-inner">
    <a class="brand light" href="${url(lang, '/')}"><img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="34" height="42"><strong>${title}</strong></a>
    <div class="app-bar-tools">
      <span class="muted-light small" data-user-label></span>
      ${extra}
      ${path ? langLinks(lang, path) : ''}
      <a class="app-link" href="${url(lang, '/')}">${_('p_to_site')}</a>
      <button type="button" class="btn btn-ghost-light btn-sm" data-logout>${_('p_logout')}</button>
    </div>
  </div>
</header>`;
};

export function loginPage(ctx, lang = 'de') {
  const _ = t(lang);
  const site = ctx.content.site;
  const body = `
<main class="login">
  <div class="login-visual">
    <img src="${esc(img(site.login_bild, 1400))}" alt="" aria-hidden="true">
    <a class="brand light" href="${url(lang, '/')}"><img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="48" height="60"><span>${_('p_back')}</span></a>
    <div class="login-claim"><div class="h1 big light">Team<br><span class="gold">#LBC3</span></div><p class="lead light">${_('p_claim')}</p></div>
  </div>
  <div class="login-panel">
    <div class="login-box">
      <div class="login-langs">${langLinks(lang, '/login/')}</div>
      <h1 class="h1">${_('p_signin')}</h1>
      <div class="segmented" role="tablist">
        <button type="button" role="tab" aria-selected="true" class="is-active" data-role-tab="sponsor">${_('p_tab_partner')}</button>
        <button type="button" role="tab" aria-selected="false" data-role-tab="admin">${_('p_tab_admin')}</button>
      </div>
      <p class="muted" data-role-hint>${_('p_hint_partner')}</p>

      <form class="form" data-login-form>
        <label class="field"><span>${_('f_email')}</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="field" data-pw-field><span>${_('p_password')}</span><input name="password" type="password" autocomplete="current-password"></label>
        <button class="btn btn-dark btn-block" type="submit">${_('p_signin')}</button>
        <div class="split-links">
          <button type="button" class="link-btn" data-magic>${_('p_magic')}</button>
          <button type="button" class="link-btn" data-reset>${_('p_forgot')}</button>
        </div>
      </form>

      <form class="form" data-setpw-form hidden>
        <h2 class="h2">${_('p_setpw_title')}</h2>
        <p class="muted">${_('p_setpw_text')}</p>
        <label class="field"><span>${_('p_newpw')}</span><input name="password" type="password" minlength="10" required autocomplete="new-password"></label>
        <button class="btn btn-red btn-block" type="submit">${_('p_savepw')}</button>
      </form>

      <div class="form-msg" data-msg role="status" hidden></div>

      <div class="note-red">${_('p_squadra_note')} <a href="${url(lang, '/squadra-tre/')}">${_('p_more')}</a></div>
      <p class="muted small">${_('p_access_note')}</p>
    </div>
  </div>
</main>`;
  return bareLayout({ title: _('p_title_login'), body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-login', lang, texts: jsTexts(lang) });
}

export function berichtPage(ctx, lang = 'de') {
  const _ = t(lang);
  const body = `
${topbar(_('p_topbar'), '', lang, '/bericht/')}
<main class="wrap section" data-bericht>
  <div class="loading" data-loading>${_('p_loading')}</div>
  <div class="form-msg" data-msg role="status" hidden></div>
  <div data-content hidden>
    <div class="section-head">
      <div>
        <div class="eyebrow">${_('p_eyebrow')}</div>
        <h1 class="h1 big">${_('season')} <span data-year></span></h1>
        <p class="lead">${_('p_lead')}</p>
      </div>
      <div class="stack-end">
        <label class="field inline"><span>${_('season')}</span><select data-season-select></select></label>
        <span class="muted small" data-status></span>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi dark"><span>${_('p_k_total')}</span><strong data-k="gesamt"></strong></div>
      <div class="kpi"><span>${_('p_k_partner')}</span><strong data-k="partner"></strong></div>
      <div class="kpi"><span>${_('p_k_weekends')}</span><strong data-k="rennwochenenden"></strong></div>
      <div class="kpi"><span>${_('p_k_km')}</span><strong data-k="kilometer"></strong></div>
    </div>
    <div class="grid-2 align-start">
      <div class="card flush">
        <h2 class="h3 pad">${_('p_by_cat')}</h2>
        <div class="table-box plain"><table class="table compact"><thead><tr><th>${_('p_col_cat')}</th><th class="num">${_('p_col_amount')}</th><th class="num">${_('p_col_share')}</th></tr></thead><tbody data-rows></tbody></table></div>
      </div>
      <div class="stack">
        <div class="card">
          <h2 class="h3">${_('p_financing')}</h2>
          <dl class="kv" data-finanzierung></dl>
        </div>
        <div class="card dark">
          <h2 class="h3 gold">${_('p_good')}</h2>
          <p>${_('p_good_text')}</p>
          <a class="btn btn-gold btn-sm" href="${url(lang, '/partner/')}">${_('p_to_partner')}</a>
        </div>
      </div>
    </div>
    <div class="card mt"><h2 class="h3">${_('p_review')}</h2><div class="prose" data-rueckblick></div></div>
    <div class="card mt"><h2 class="h3">${_('p_downloads')}</h2><div class="downloads" data-downloads></div></div>
  </div>
  <section class="card mt" data-sw-own hidden>
    <div class="row-between"><h2 class="h2">${_('p_wall_title')}</h2><span class="badge" data-sw-status></span></div>
    <p class="muted">${_('p_wall_text')}</p>
    ${sponsorWallForm(false, lang)}
  </section>
</main>`;
  return bareLayout({ title: _('p_title_bericht'), body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-app', lang, texts: jsTexts(lang) });
}

export function teamPage(ctx) {
  const kat = KATEGORIEN.map((k, i) => `<label class="field"><span>${esc(k)} (€)</span><input type="number" min="0" step="0.01" inputmode="decimal" data-ausgabe="${esc(k)}" id="aus-${i}" placeholder="0"></label>`).join('');
  const preis = (key, label, step) => `<label class="field"><span>${label}</span><input type="number" min="0" step="${step}" inputmode="decimal" data-preis="${key}"></label>`;
  const body = `
${topbar('LBC3 · TEAM-BEREICH', '<a class="app-link" href="/admin/">Inhalte bearbeiten (CMS)</a>')}
<div class="app" data-team>
  <nav class="app-nav" aria-label="Team-Menü">
    <button type="button" class="is-active" data-tab="bericht">Ausgabenbericht</button>
    <button type="button" data-tab="zugaenge">Partner &amp; Admins</button>
    <button type="button" data-tab="squadra">Squadra Tre</button>
    <button type="button" data-tab="sponsorwall">Partner-Wall</button>
    <button type="button" data-tab="einladen">Squadra einladen</button>
    <button type="button" data-tab="instagram">Instagram</button>
    <button type="button" data-tab="besucher">Besucher</button>
    <button type="button" data-tab="klicks">Partner-Klicks</button>
    <a href="/admin/">Fotos, News, Rennen, Texte ↗</a>
  </nav>
  <main class="app-main">
    <div class="loading" data-loading>Wird geladen …</div>
    <div class="form-msg" data-msg role="status" hidden></div>

    <section data-panel="bericht" hidden>
      <div class="section-head">
        <h1 class="h1">Ausgabenbericht</h1>
        <div class="row">
          <label class="field inline"><span>Saison</span><input type="number" min="2020" max="2100" data-saison></label>
          <span class="badge" data-status-badge></span>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div><h2 class="h3">1 · Einsätze: Rennen &amp; Training</h2>
          <p class="muted small">Pro Wochenende eine Zeile. Diesel wird aus den Kilometern berechnet, Reifen und Verpflegung aus der Anzahl. Training-Wochenenden am schnellsten mit „Kopieren“ anlegen.</p></div>
          <label class="btn btn-outline btn-sm file-btn">Kostendatei laden<input type="file" accept="application/json,.json" data-kosten-file hidden></label>
        </div>
        <details class="fold"><summary>Preise für die Berechnung</summary>
          <div class="grid-auto">
            ${preis('diesel', 'Diesel (€/Liter)', '0.01')}
            ${preis('verbrauch', 'Verbrauch Gespann (Liter/100 km)', '0.01')}
            ${preis('reifen', 'Reifensatz (€)', '1')}
            ${preis('benzin', 'Kartbenzin (€/Liter)', '0.01')}
            ${preis('verpflegung', 'Verpflegung (€/Tag, Familie)', '1')}
          </div>
        </details>
        <div class="einsatz-list" data-einsaetze></div>
        <div class="btn-row">
          <button type="button" class="btn btn-dark btn-sm" data-add="rennen">+ Rennen</button>
          <button type="button" class="btn btn-outline btn-sm" data-add="training">+ Training</button>
        </div>
      </div>
      <div class="card mt">
        <h2 class="h3">2 · Weitere Ausgaben (nicht pro Wochenende)</h2>
        <p class="muted small">Zum Beispiel Kart, Motorrevision, Ersatzteile, Lizenzen, Einschreibungen, Wohnmobil, Team. Wird zu den Einsätzen dazugezählt.</p>
        <div class="grid-auto">${kat}</div>
      </div>
      <div class="card mt">
        <h2 class="h3">3 · Übersicht – so sehen es die Partner</h2>
        <table class="kosten-sum"><tbody data-kosten-summary></tbody></table>
        <p class="muted small" data-kosten-hinweis></p>
      </div>
      <div class="grid-2 mt align-start">
        <div class="card">
          <h2 class="h3">Kennzahlen</h2>
          <label class="field"><span>Rennwochenenden</span><input type="number" min="0" data-f="rennwochenenden"></label>
          <label class="field"><span>Gefahrene Kilometer (Rennen &amp; Training)</span><input type="number" min="0" data-f="kilometer"></label>
          <p class="muted small">Wird aus den Einsätzen automatisch ausgefüllt.</p>
        </div>
        <div class="card">
          <h2 class="h3">Finanzierung (€)</h2>
          <label class="field"><span>Partner (Pakete)</span><input type="number" min="0" step="0.01" data-f="fin_sponsoren"></label>
          <label class="field"><span>Squadra Tre (Unterstützer)</span><input type="number" min="0" step="0.01" data-f="fin_squadra"></label>
          <label class="field"><span>Eigenmittel Familie</span><input type="number" min="0" step="0.01" data-f="fin_eigen"></label>
          <label class="field"><span>Sonstiges (z. B. Förderungen)</span><input type="number" min="0" step="0.01" data-f="fin_sonstiges"></label>
        </div>
      </div>
      <div class="card mt">
        <label class="field"><span>Saisonrückblick für Partner und Squadra Tre (Deutsch)</span><textarea rows="6" data-f="rueckblick"></textarea></label>
        <details class="fold"><summary>Saisonrückblick in weiteren Sprachen (Italienisch, Englisch, Französisch)</summary>
          <p class="muted small">Partner und Squadra-Mitglieder sehen den Rückblick in ihrer Sprache. Leer gelassen erscheint der deutsche Text. Vertrauliche Texte übersetzen wir nicht automatisch über Dienste außerhalb der EU – hier selbst eintragen oder prüfen.</p>
          <label class="field"><span>Italiano</span><textarea rows="5" data-f="rueckblick_it" lang="it"></textarea></label>
          <label class="field"><span>English</span><textarea rows="5" data-f="rueckblick_en" lang="en"></textarea></label>
          <label class="field"><span>Français</span><textarea rows="5" data-f="rueckblick_fr" lang="fr"></textarea></label>
        </details>
        <div class="grid-2">
          <label class="field"><span>Jahresbericht (PDF)</span><input type="file" accept="application/pdf" data-pdf="pdf_bericht"><small class="muted" data-pdf-name="pdf_bericht"></small></label>
          <label class="field"><span>Belegübersicht (PDF)</span><input type="file" accept="application/pdf" data-pdf="pdf_belege"><small class="muted" data-pdf-name="pdf_belege"></small></label>
        </div>
      </div>
      <div class="grid-2 mt">
        <div class="note-box"><strong>Partner</strong> sehen den Bericht über ihren Login – jederzeit, sobald er freigegeben ist.</div>
        <div class="note-box"><strong>Squadra Tre</strong> bekommt den Bericht am Saisonende per E-Mail (nur bestätigte Mitglieder mit Häkchen „Jahresbericht“).</div>
      </div>
      <div class="btn-row mt">
        <button type="button" class="btn btn-dark" data-save>Speichern</button>
        <button type="button" class="btn btn-red" data-toggle-release></button>
        <button type="button" class="btn btn-outline" data-send-report>Jahresbericht an Squadra Tre senden</button>
        <a class="btn btn-outline" href="/bericht/" target="_blank">Vorschau als Partner</a>
      </div>
      <p class="muted small" data-mail-info></p>
    </section>

    <section data-panel="zugaenge" hidden>
      <h1 class="h1">Partner &amp; Admins</h1>
      <div class="grid-2 align-start">
        <div class="card flush"><div class="table-box plain"><table class="table"><thead><tr><th>Name / Firma</th><th>E-Mail</th><th>Rolle</th><th>Sprache</th><th></th></tr></thead><tbody data-profiles></tbody></table></div></div>
        <form class="card form" data-invite-form>
          <h2 class="h3">Zugang einladen</h2>
          <label class="field"><span>E-Mail</span><input type="email" name="email" required></label>
          <label class="field"><span>Name / Firma</span><input name="firma" required></label>
          <label class="field"><span>Rolle</span><select name="rolle"><option value="sponsor">Partner – Login für den Ausgabenbericht</option><option value="admin">Admin – darf alles bearbeiten</option></select></label>
          <label class="field"><span>Sprache (Einladung, E-Mails, Bericht)</span><select name="sprache"><option value="de">Deutsch</option><option value="it">Italiano</option><option value="en">English</option><option value="fr">Français</option></select></label>
          <button class="btn btn-dark" type="submit">Einladung senden</button>
          <p class="muted small">Die Person bekommt eine E-Mail in der gewählten Sprache und legt beim ersten Login ihr Passwort fest.</p>
        </form>
      </div>
    </section>

    <section data-panel="squadra" hidden>
      <div class="section-head">
        <h1 class="h1">Squadra Tre</h1>
        <div class="btn-row">
          <button type="button" class="btn btn-red" data-publish>Wall of Fame veröffentlichen</button>
          <a class="btn btn-outline" href="/wall-of-fame/druck/" target="_blank">Wall of Fame drucken</a>
          <button type="button" class="btn btn-outline" data-export>CSV</button>
          <button type="button" class="btn btn-outline" data-wochenbericht>Wochenbericht jetzt senden</button>
        </div>
      </div>
      <div class="kpis small-kpis">
        <div class="kpi dark"><span>Mitglieder bestätigt</span><strong data-sk="gesamt">–</strong></div>
        <div class="kpi"><span>Freunde / Fans</span><strong data-sk="freund">–</strong></div>
        <div class="kpi"><span>Unterstützer</span><strong data-sk="unterstuetzer">–</strong></div>
        <div class="kpi"><span>Fotos warten auf Prüfung</span><strong data-sk="pruefen">–</strong></div>
      </div>
      <div class="note-box">So läuft’s: Anmeldung → E-Mail-Bestätigung (unter 16: durch die Eltern; Fotos unter 18 nur mit Zustimmung der Eltern) → ihr prüft Foto, Einwortnamen und Spitznamen → „Wall of Fame veröffentlichen“. Namen erscheinen als Vorname + Initiale. Fotos nur, wenn ihr sie freigebt. Nicht bestätigte Anmeldungen löscht das System nach 7 Tagen automatisch. „Ausblenden“ nimmt jemanden von der Wall, ohne die Anmeldung zu löschen. Jeden Sonntagmorgen kommt automatisch ein Wochenbericht mit den neuen Mitgliedern und dem Text für den Instagram-Post per E-Mail.</div>
      <div class="row mt">
        <div class="pill-row compact" data-sfilter>
          <button type="button" class="pill is-active" data-f="alle">Alle</button>
          <button type="button" class="pill" data-f="pruefen">Foto prüfen</button>
          <button type="button" class="pill" data-f="name">Name prüfen</button>
          <button type="button" class="pill" data-f="eltern">Eltern offen</button>
          <button type="button" class="pill" data-f="freund">Freunde</button>
          <button type="button" class="pill" data-f="unterstuetzer">Unterstützer</button>
          <button type="button" class="pill" data-f="offen">Unbestätigt</button>
        </div>
        <label class="field inline"><span>Suche</span><input type="search" data-ssearch placeholder="Name, E-Mail, Instagram"></label>
      </div>
      <div class="member-grid mt" data-squadra></div>

      <div class="grid-2 mt align-start">
        <form class="card form" data-add-friend>
          <h2 class="h3">Freund hinzufügen</h2>
          <p class="muted small">Für Freunde, die ihr selbst eintragt – z. B. am Rennzelt oder in der Schule. Nur mit Einwilligung, und bitte festhalten, wie sie gegeben wurde. Ohne E-Mail bekommen sie keine Post.</p>
          <div class="photo-pick">
            <div class="photo-preview" data-af-preview>Foto</div>
            <div><label class="btn btn-outline btn-sm"><input type="file" accept="image/*" data-af-photo hidden><span>Foto auswählen</span></label></div>
          </div>
          <label class="field"><span>Name *</span><input name="name" required maxlength="120"></label>
          <label class="field"><span>Name auf der Wall (leer = Vorname + Initiale)</span><input name="angezeigter_name" maxlength="60"></label>
          <div class="grid-2 tight">
            <label class="field"><span>Instagram</span><input name="instagram" placeholder="@" maxlength="40"></label>
            <label class="field"><span>E-Mail (optional)</span><input name="email" type="email" maxlength="200"></label>
          </div>
          <label class="field"><span>Spitzname (optional, max. 20 Zeichen – ersetzt den Namen auf der Wall)</span><input name="spitzname" maxlength="20"></label>
          <label class="field"><span>Alter *</span><select name="altersstufe" required data-af-age><option value="18plus">18 oder älter</option><option value="16bis17">16 oder 17</option><option value="unter16">unter 16</option></select></label>
          <label class="field" data-af-parent hidden><span>E-Mail eines Elternteils * (bekommt die Eltern-Bestätigung)</span><input name="eltern_email" type="email" maxlength="200"></label>
          <label class="field"><span>Nachweis der Einwilligung * (wie und wann? z. B. „mündlich am Rennzelt Ampfing, 12.05.2026, Mutter anwesend“)</span><input name="einwilligung_nachweis" required maxlength="300"></label>
          <label class="check"><input type="checkbox" name="einwilligung" required><span>Die Einwilligung für Name und Foto auf der Wall of Fame liegt vor. Bei Minderjährigen geht zusätzlich die Eltern-Bestätigung per E-Mail raus; der Eintrag und das Foto erscheinen erst nach Zustimmung der Eltern (unter 16: sonst automatische Löschung nach 7 Tagen).</span></label>
          <button class="btn btn-dark" type="submit">Hinzufügen</button>
        </form>
        <form class="card form" data-message-form>
          <h2 class="h3">Nachricht an die Squadra</h2>
          <p class="muted small">Geht an alle bestätigten Mitglieder mit Häkchen „Renn-Updates“ (<strong data-updates-count>0</strong>).</p>
          <label class="field"><span>Betreff</span><input name="betreff" required maxlength="150" placeholder="Nächstes Rennen: Ampfing, 2. Mai!"></label>
          <label class="field"><span>Text</span><textarea name="text" rows="7" required maxlength="5000"></textarea></label>
          <div class="btn-row"><button class="btn btn-outline" type="button" data-msg-test>Testmail an uns</button><button class="btn btn-red" type="submit">An alle senden</button></div>
        </form>
      </div>
    </section>

    <section data-panel="sponsorwall" hidden>
      <div class="section-head"><h1 class="h1">Partner-Wall</h1><button type="button" class="btn btn-red" data-publish>Wall of Fame veröffentlichen</button></div>
      <p class="muted">Partner legen ihren Eintrag im eigenen Login an (Website + mindestens ein Social-Media-Kanal sind Pflicht). Nach jeder Änderung muss der Eintrag hier neu freigegeben werden. Das Logo-Laufband auf der Startseite bleibt davon unberührt – es wird weiter im CMS gepflegt.</p>
      <div class="member-grid" data-sponsorwall></div>
      <div class="card mt">
        <h2 class="h3">Eintrag für einen Partner anlegen oder bearbeiten</h2>
        ${sponsorWallForm(true)}
      </div>
    </section>

    <section data-panel="instagram" hidden>
      <h1 class="h1">Instagram auf der Website</h1>
      <p class="lead">Die 4 neuesten Beiträge erscheinen automatisch auf der Startseite. Auf der Partner-Seite erscheinen die 3 neuesten Beiträge mit <strong>#LBC3Partner</strong> in der Bildunterschrift – oder die, die du unten anhakst. Einmal täglich aktualisiert; die Bilder liegen auf unserem Server, Besucher laden nichts von Instagram.</p>
      <div class="grid-2 align-start">
        <div class="card">
          <h2 class="h3">Status</h2>
          <p data-ig-status>Wird geladen …</p>
          <div class="btn-row">
            <button type="button" class="btn btn-outline btn-sm" data-ig-rebuild>Jetzt aktualisieren</button>
            <button type="button" class="btn btn-outline btn-sm" data-ig-disconnect>Trennen</button>
          </div>
        </div>
        <form class="card form" data-ig-form>
          <h2 class="h3">Instagram verbinden</h2>
          <p class="muted small">Den Zugangsschlüssel aus dem Meta-Entwicklerbereich (Instagram → „API setup with Instagram login“ → „Generate token“) hier einfügen. Er wird nur auf dem Server gespeichert und alle paar Wochen automatisch verlängert – bitte nie per E-Mail oder Chat verschicken.</p>
          <label class="field"><span>Zugangsschlüssel</span><input name="token" type="password" autocomplete="off" required minlength="40"></label>
          <button class="btn btn-dark" type="submit">Verbinden</button>
        </form>
      </div>
      <div class="card mt" data-ig-pick hidden>
        <div class="section-head"><h2 class="h3">Beiträge auswählen</h2><button type="button" class="btn btn-red btn-sm" data-ig-save>Speichern &amp; Website aktualisieren</button></div>
        <p class="muted small">„Startseite“ abhaken blendet einen Beitrag auf der Website aus. „Partner-Seite“ anhaken zeigt ihn bei den Partnern – auch wenn #LBC3Partner fehlt. Beiträge mit geschützten Begriffen aus dem Glossar erscheinen nie.</p>
        <div class="ig-pick-list" data-ig-list></div>
      </div>
    </section>

    <section data-panel="besucher" hidden>
      <div class="section-head">
        <h1 class="h1">Besucher</h1>
        <div class="pill-row" data-bz-range>
          <button type="button" class="pill" data-tage="7">7 Tage</button>
          <button type="button" class="pill is-active" data-tage="30">30 Tage</button>
          <button type="button" class="pill" data-tage="365">12 Monate</button>
        </div>
      </div>
      <p class="lead">Gezählt wird anonym auf unserem eigenen Server – ohne Cookies, ohne Google Analytics. Ein Besucher ist ein Gerät pro Tag; wer an drei Tagen kommt, zählt dreimal. Suchmaschinen-Roboter und der Team-Bereich werden nicht mitgezählt.</p>
      <div class="kpis" data-bz-kpis></div>
      <div class="card"><h2 class="h3">Verlauf</h2><div class="bz-chart" data-bz-chart></div><p class="muted small"><span class="bz-key bz-key-a"></span> Seitenaufrufe · <span class="bz-key bz-key-b"></span> eindeutige Besucher</p></div>
      <div class="grid-2 mt align-start">
        <div class="card"><h2 class="h3">Beliebteste Seiten</h2><table class="kosten-sum"><tbody data-bz="seiten"></tbody></table></div>
        <div class="card"><h2 class="h3">Woher die Besucher kommen</h2><table class="kosten-sum"><tbody data-bz="herkunft"></tbody></table></div>
        <div class="card"><h2 class="h3">Länder</h2><table class="kosten-sum"><tbody data-bz="laender"></tbody></table></div>
        <div class="card"><h2 class="h3">Sprache &amp; Gerät</h2><table class="kosten-sum"><tbody data-bz="sprachen"></tbody></table><table class="kosten-sum mt"><tbody data-bz="geraete"></tbody></table></div>
      </div>
      <label class="check mt"><input type="checkbox" data-bz-ich> Meine eigenen Besuche auf diesem Gerät nicht mitzählen</label>
    </section>

    <section data-panel="klicks" hidden>
      <div class="section-head">
        <h1 class="h1">Partner-Klicks</h1>
        <label class="field inline"><span>Jahr</span><input type="number" min="2026" max="2100" data-klick-jahr></label>
      </div>
      <p class="lead">So oft haben Besucher auf die Links eurer Partner geklickt – Logo im Laufband, Logo auf der Partner-Seite, „Website besuchen“ und Social-Media-Knöpfe auf der Partner-Wall. Gezählt wird anonym, ohne Cookies und ohne IP-Adresse; Suchmaschinen-Roboter werden nicht mitgezählt.</p>
      <div class="kpis" data-klick-kpis></div>
      <div class="card mt"><div class="table-box plain"><table class="kosten-sum klick-table"><thead><tr><th>Partner</th><th class="num">Klicks</th><th class="num">Letzte 30 Tage</th><th>Verlauf (Jan–Dez)</th><th>Woher</th></tr></thead><tbody data-klick-rows><tr><td colspan="5" class="muted">Wird geladen …</td></tr></tbody></table></div></div>
      <div class="btn-row mt">
        <button type="button" class="btn btn-outline btn-sm" data-klick-csv>Als Tabelle herunterladen (CSV)</button>
        <button type="button" class="btn btn-outline btn-sm" data-klick-print>Drucken / als PDF sichern</button>
      </div>
      <p class="muted small">Tipp fürs Jahresgespräch: Zahl der Klicks zusammen mit Rennwochenenden und Instagram-Reichweite zeigen. Die Zählung startet mit dem Website-Start am 31.10.2026.</p>
    </section>

    <section data-panel="einladen" hidden>
      <h1 class="h1">Squadra Tre einladen</h1>
      <p class="lead">Instagram erlaubt es nicht, Follower automatisch irgendwo einzutragen oder allen eine Nachricht zu schicken. So erreicht ihr trotzdem alle:</p>
      <div class="grid-2 align-start">
        <div class="card">
          <h2 class="h3">1 · Link in Luigis Bio</h2>
          <div class="copy-box" data-copy-src data-invite-link></div>
          <button class="btn btn-outline btn-sm" data-copy-btn>Kopieren</button>
          <h2 class="h3 mt">2 · Hashtags</h2>
          <div class="copy-box" data-copy-src>#SquadraTre #LBC3</div>
          <button class="btn btn-outline btn-sm" data-copy-btn>Kopieren</button>
          <h2 class="h3 mt">3 · So geht’s auf Instagram</h2>
          <ul class="lines small">
            <li><strong>Story mit Link-Sticker</strong> auf den Link oben – und als Highlight „Squadra Tre“ speichern.</li>
            <li><strong>Beitrag fixieren</strong> (oben im Profil anpinnen) mit dem Text rechts.</li>
            <li><strong>QR-Code</strong>: Profil → Teilen → QR-Code. Ausdrucken und am Zelt aufhängen.</li>
            <li><strong>Neue Follower</strong>: kurze DM mit dem Text unten – einzeln, nicht als Massennachricht.</li>
            <li><strong>Wöchentlich</strong> neue Mitglieder in der Story begrüßen („Benvenuti in der Squadra!“).</li>
          </ul>
        </div>
        <div class="card" data-invite-texts></div>
      </div>
      <div class="card mt">
        <h2 class="h3">Persönliche Einladung per Instagram</h2>
        <p class="muted small">Instagram-Namen eingeben, Sprache wählen, dann „Kopieren &amp; Instagram öffnen“: Der Text liegt in der Zwischenablage, der Chat mit der Person öffnet sich – Text einfügen, senden. Bitte nur Erwachsene einladen (Kinder über ihre Eltern) und höchstens 20–30 Nachrichten am Tag, damit Instagram es nicht als Spam wertet.</p>
        <form class="form ig-invite" data-igi-form>
          <label class="field"><span>Instagram-Name</span><input name="handle" placeholder="@name" autocomplete="off" autocapitalize="off" required maxlength="40"></label>
          <label class="field"><span>Sprache</span><select name="sprache"><option value="de">Deutsch</option><option value="it">Italiano</option><option value="en">English</option><option value="fr">Français</option></select></label>
          <label class="field ig-invite-text"><span>Nachricht (kann angepasst werden)</span><textarea name="text" rows="6"></textarea></label>
          <div class="btn-row"><button class="btn btn-red" type="submit">Kopieren &amp; Instagram öffnen</button></div>
        </form>
        <h3 class="h3 mt">Bisher eingeladen <span class="muted small" data-igi-count></span></h3>
        <div class="table-box plain"><table class="kosten-sum"><tbody data-igi-list><tr><td class="muted">Wird geladen …</td></tr></tbody></table></div>
      </div>
      <div class="grid-2 mt align-start">
        <div class="card">
          <h2 class="h3">Persönliche Einladung per E-Mail</h2>
          <p class="muted small">Am besten aus eurem eigenen Postfach – dann ist es eine private Nachricht von euch. „Direkt senden“ verschickt sie von contact@luigi-catuogno.com, aber nur an Menschen, die ihr kennt und die einverstanden sind (Werbe-E-Mails ohne Einverständnis sind in Deutschland nicht erlaubt). Bitte nur Erwachsene einladen.</p>
          <form class="form" data-mi-form>
            <label class="field"><span>Name (optional)</span><input name="name" maxlength="80" autocomplete="off"></label>
            <label class="field"><span>E-Mail-Adresse</span><input name="email" type="email" required maxlength="200" autocomplete="off"></label>
            <label class="field"><span>Sprache</span><select name="sprache"><option value="de">Deutsch</option><option value="it">Italiano</option><option value="en">English</option><option value="fr">Français</option></select></label>
            <label class="field"><span>Nachricht (kann angepasst werden)</span><textarea name="text" rows="8"></textarea></label>
            <label class="check"><input type="checkbox" name="einverstanden"> Wir kennen die Person und sie ist mit einer Einladung per E-Mail einverstanden (nur für „Direkt senden“ nötig)</label>
            <div class="btn-row">
              <button class="btn btn-dark" type="button" data-mi-mailto>Im eigenen E-Mail-Programm öffnen</button>
              <button class="btn btn-outline" type="button" data-mi-send>Direkt senden</button>
            </div>
          </form>
          <h3 class="h3 mt">Per E-Mail eingeladen <span class="muted small" data-mi-count></span></h3>
          <div class="table-box plain"><table class="kosten-sum"><tbody data-mi-list><tr><td class="muted">Wird geladen …</td></tr></tbody></table></div>
        </div>
        <div class="card">
          <h2 class="h3">Eure Kontakte einladen: WhatsApp, SMS &amp; Co.</h2>
          <p class="muted small">Ideal für das eigene Telefonbuch: „In WhatsApp öffnen“ ohne Nummer – dann wählt ihr in WhatsApp einen oder mehrere Kontakte aus. „Teilen …“ öffnet auf dem Handy das normale Teilen-Menü (WhatsApp, SMS, Telegram, Mail …). Nummern werden nicht gespeichert.</p>
          <form class="form" data-wa-form>
            <label class="field"><span>Worum geht es?</span><select name="ziel"><option value="folgen">Luigi auf Instagram folgen</option><option value="beides">Folgen + Squadra Tre beitreten</option><option value="squadra">Squadra Tre beitreten</option></select></label>
            <label class="field"><span>Handynummer (optional, mit Ländervorwahl)</span><input name="nummer" inputmode="tel" placeholder="+49 170 1234567" maxlength="30" autocomplete="off"></label>
            <label class="field"><span>Sprache</span><select name="sprache"><option value="de">Deutsch</option><option value="it">Italiano</option><option value="en">English</option><option value="fr">Français</option></select></label>
            <label class="field"><span>Nachricht (kann angepasst werden)</span><textarea name="text" rows="6"></textarea></label>
            <div class="btn-row"><button class="btn btn-red" type="submit">In WhatsApp öffnen</button><button class="btn btn-outline" type="button" data-wa-share>Teilen …</button><button class="btn btn-outline" type="button" data-wa-copy>Text kopieren</button></div>
          </form>
        </div>
      </div>
    </section>
  </main>
</div>`;
  return bareLayout({ title: 'Team-Bereich', body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-app' });
}
