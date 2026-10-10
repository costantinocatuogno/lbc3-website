// Login, Ausgabenbericht (Sponsoren) und Team-Bereich (Admins).
// Diese Seiten enthalten KEINE vertraulichen Daten – alles wird erst nach dem Login
// aus Supabase geladen und dort per Row-Level-Security geschützt.
import { esc, icon, img } from '../lib/html.mjs';
import { bareLayout } from './layout.mjs';

export const KATEGORIEN = [
  'Reisekosten Deutschland & Italien',
  'Wohnmobil (Anschaffung / Unterhalt)',
  'Kart & Chassis',
  'Motor, Vergaser & Ersatzteile',
  'Reifen',
  'Benzin & Öl',
  'Nenngelder',
  'Team & Betreuung'
];


// Formular für den eigenen Wall-of-Fame-Eintrag (Sponsor im Login – oder Admin für einen Sponsor)
function sponsorWallForm(admin = false) {
  return `
<form class="form" data-sw-form>
  <input type="hidden" name="id">
  <div class="grid-2 tight">
    <label class="field"><span>Firma *</span><input name="firma" required maxlength="120"></label>
    <label class="field"><span>Ansprechpartner</span><input name="ansprechpartner" maxlength="120"></label>
  </div>
  <label class="field"><span>Website *</span><input name="website" inputmode="url" required placeholder="www.firma.de" maxlength="300"></label>
  <p class="muted small">Mindestens ein Social-Media-Kanal ist Pflicht:</p>
  <div class="grid-2 tight">
    <label class="field"><span>Instagram</span><input name="instagram" placeholder="https://instagram.com/firma oder @firma" maxlength="300"></label>
    <label class="field"><span>Facebook</span><input name="facebook" placeholder="https://facebook.com/firma" maxlength="300"></label>
    <label class="field"><span>LinkedIn</span><input name="linkedin" placeholder="https://linkedin.com/company/firma" maxlength="300"></label>
    <label class="field"><span>TikTok</span><input name="tiktok" placeholder="https://tiktok.com/@firma" maxlength="300"></label>
    <label class="field"><span>YouTube</span><input name="youtube" placeholder="https://youtube.com/@firma" maxlength="300"></label>
    ${admin ? '<label class="field"><span>Paket</span><input name="paket" maxlength="60"></label>' : ''}
  </div>
  <label class="field"><span>Kurzer Text (max. 280 Zeichen)</span><textarea name="text" rows="3" maxlength="280" placeholder="Was macht eure Firma? Warum unterstützt ihr Luigi?"></textarea></label>
  <div class="photo-pick">
    <div class="photo-preview logo" data-sw-preview>Logo</div>
    <div><span class="field-label">Logo (PNG/SVG mit transparentem Hintergrund ideal, max. 5 MB)</span>
      <label class="btn btn-outline btn-sm"><input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" data-sw-logo hidden><span>Logo auswählen</span></label></div>
  </div>
  <label class="check"><input type="checkbox" name="einwilligung" required><span>Wir sind einverstanden, dass Logo, Firmenname, Text und Links auf Luigis Website und auf der gedruckten Wall of Fame am Rennzelt gezeigt werden.</span></label>
  <div class="btn-row"><button class="btn btn-dark" type="submit">${admin ? 'Eintrag speichern' : 'Eintrag speichern & zur Freigabe senden'}</button>${admin ? '<button type="button" class="btn btn-outline" data-sw-reset>Neu</button>' : ''}</div>
</form>`;
}

const topbar = (title, extra = '') => `
<header class="app-bar">
  <div class="wrap app-bar-inner">
    <a class="brand light" href="/"><img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="34" height="42"><strong>${title}</strong></a>
    <div class="app-bar-tools">
      <span class="muted-light small" data-user-label></span>
      ${extra}
      <a class="app-link" href="/">Zur Website</a>
      <button type="button" class="btn btn-ghost-light btn-sm" data-logout>Abmelden</button>
    </div>
  </div>
</header>`;

export function loginPage(ctx) {
  const site = ctx.content.site;
  const body = `
<main class="login">
  <div class="login-visual">
    <img src="${esc(img(site.login_bild, 1400))}" alt="" aria-hidden="true">
    <a class="brand light" href="/"><img src="/assets/img/lbc3-logo.png" alt="LBC3 Logo" width="48" height="60"><span>← Zurück zur Website</span></a>
    <div class="login-claim"><div class="h1 big light">Team<br><span class="gold">#LBC3</span></div><p class="lead light">Der geschützte Bereich für unsere Sponsoren und das Team.</p></div>
  </div>
  <div class="login-panel">
    <div class="login-box">
      <h1 class="h1">Anmelden</h1>
      <div class="segmented" role="tablist">
        <button type="button" role="tab" aria-selected="true" class="is-active" data-role-tab="sponsor">Sponsor</button>
        <button type="button" role="tab" aria-selected="false" data-role-tab="admin">Team / Admin</button>
      </div>
      <p class="muted" data-role-hint>Als Sponsor siehst du hier jederzeit unseren aktuellen Ausgabenbericht.</p>

      <form class="form" data-login-form>
        <label class="field"><span>E-Mail</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="field" data-pw-field><span>Passwort</span><input name="password" type="password" autocomplete="current-password"></label>
        <button class="btn btn-dark btn-block" type="submit">Anmelden</button>
        <div class="split-links">
          <button type="button" class="link-btn" data-magic>Login-Link per E-Mail</button>
          <button type="button" class="link-btn" data-reset>Passwort vergessen?</button>
        </div>
      </form>

      <form class="form" data-setpw-form hidden>
        <h2 class="h2">Passwort festlegen</h2>
        <p class="muted">Willkommen! Lege jetzt dein persönliches Passwort fest (mindestens 10 Zeichen).</p>
        <label class="field"><span>Neues Passwort</span><input name="password" type="password" minlength="10" required autocomplete="new-password"></label>
        <button class="btn btn-red btn-block" type="submit">Passwort speichern</button>
      </form>

      <div class="form-msg" data-msg role="status" hidden></div>

      <div class="note-red">Mitglied der <strong>Squadra 3</strong>? Du brauchst keinen Login – unseren Jahresbericht bekommst du am Saisonende per E-Mail. <a href="/squadra-3/">Mehr erfahren</a></div>
      <p class="muted small">Zugänge werden von uns vergeben. Sponsoren erhalten ihre Einladung per E-Mail.</p>
    </div>
  </div>
</main>`;
  return bareLayout({ title: 'Login', body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-login' });
}

export function berichtPage(ctx) {
  const body = `
${topbar('AUSGABENBERICHT · NUR FÜR SPONSOREN')}
<main class="wrap section" data-bericht>
  <div class="loading" data-loading>Bericht wird geladen …</div>
  <div class="form-msg" data-msg role="status" hidden></div>
  <div data-content hidden>
    <div class="section-head">
      <div>
        <div class="eyebrow">Ausgabenbericht für unsere Sponsoren · jederzeit aktuell</div>
        <h1 class="h1 big">Saison <span data-year></span></h1>
        <p class="lead">Transparenz ist uns wichtig. Hier zeigen wir, wofür eure Unterstützung eingesetzt wird.</p>
      </div>
      <div class="stack-end">
        <label class="field inline"><span>Saison</span><select data-season-select></select></label>
        <span class="muted small" data-status></span>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi dark"><span>Gesamtausgaben Saison</span><strong data-k="gesamt"></strong></div>
      <div class="kpi"><span>Davon durch Sponsoren &amp; Squadra 3</span><strong data-k="partner"></strong></div>
      <div class="kpi"><span>Rennwochenenden</span><strong data-k="rennwochenenden"></strong></div>
      <div class="kpi"><span>Kilometer zu Rennen</span><strong data-k="kilometer"></strong></div>
    </div>
    <div class="grid-2 align-start">
      <div class="card flush">
        <h2 class="h3 pad">Ausgaben nach Kategorie</h2>
        <div class="table-box plain"><table class="table compact"><thead><tr><th>Kategorie</th><th class="num">Betrag</th><th class="num">Anteil</th></tr></thead><tbody data-rows></tbody></table></div>
      </div>
      <div class="stack">
        <div class="card">
          <h2 class="h3">Finanzierung</h2>
          <dl class="kv" data-finanzierung></dl>
        </div>
        <div class="card dark">
          <h2 class="h3 gold">Gut zu wissen</h2>
          <p>Als Sponsor siehst du diesen Bericht jederzeit und immer auf dem aktuellen Stand. Die Mitglieder der Squadra 3 erhalten eine Zusammenfassung am Saisonende per E-Mail.</p>
          <a class="btn btn-gold btn-sm" href="/partner/">Zur Partnerseite</a>
        </div>
      </div>
    </div>
    <div class="card mt"><h2 class="h3">Saisonrückblick</h2><div class="prose" data-rueckblick></div></div>
    <div class="card mt"><h2 class="h3">Downloads</h2><div class="downloads" data-downloads></div></div>
  </div>
  <section class="card mt" data-sw-own hidden>
    <div class="row-between"><h2 class="h2">Euer Eintrag auf der Wall of Fame</h2><span class="badge" data-sw-status></span></div>
    <p class="muted">Jeder Sponsor bekommt auf Luigis Partnerseite einen eigenen Eintrag – mit Logo, Link zu eurer Website und euren Social-Media-Kanälen. Am Saisonende steht er auch auf der gedruckten Wall of Fame am Rennzelt. Nach jeder Änderung prüfen wir den Eintrag kurz und schalten ihn frei.</p>
    ${sponsorWallForm(false)}
  </section>
</main>`;
  return bareLayout({ title: 'Ausgabenbericht', body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-app' });
}

export function teamPage(ctx) {
  const kat = KATEGORIEN.map((k, i) => `<label class="field"><span>${esc(k)} (€)</span><input type="number" min="0" step="0.01" inputmode="decimal" data-ausgabe="${esc(k)}" id="aus-${i}"></label>`).join('');
  const body = `
${topbar('LBC3 · TEAM-BEREICH', '<a class="app-link" href="/admin/">Inhalte bearbeiten (CMS)</a>')}
<div class="app" data-team>
  <nav class="app-nav" aria-label="Team-Menü">
    <button type="button" class="is-active" data-tab="bericht">Ausgabenbericht</button>
    <button type="button" data-tab="zugaenge">Sponsoren &amp; Admins</button>
    <button type="button" data-tab="squadra">Squadra 3</button>
    <button type="button" data-tab="sponsorwall">Sponsoren-Wall</button>
    <button type="button" data-tab="einladen">Squadra einladen</button>
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
        <h2 class="h3">Ausgaben nach Kategorie</h2>
        <div class="grid-auto">${kat}</div>
        <p class="muted small">Summe: <strong data-summe>0 €</strong></p>
      </div>
      <div class="grid-2 mt align-start">
        <div class="card">
          <h2 class="h3">Kennzahlen</h2>
          <label class="field"><span>Rennwochenenden</span><input type="number" min="0" data-f="rennwochenenden"></label>
          <label class="field"><span>Kilometer zu Rennen</span><input type="number" min="0" data-f="kilometer"></label>
        </div>
        <div class="card">
          <h2 class="h3">Finanzierung (€)</h2>
          <label class="field"><span>Sponsoren (Pakete)</span><input type="number" min="0" step="0.01" data-f="fin_sponsoren"></label>
          <label class="field"><span>Squadra 3 (Unterstützer)</span><input type="number" min="0" step="0.01" data-f="fin_squadra"></label>
          <label class="field"><span>Eigenmittel Familie</span><input type="number" min="0" step="0.01" data-f="fin_eigen"></label>
          <label class="field"><span>Sonstiges (z. B. Förderungen)</span><input type="number" min="0" step="0.01" data-f="fin_sonstiges"></label>
        </div>
      </div>
      <div class="card mt">
        <label class="field"><span>Saisonrückblick für Sponsoren und Squadra 3</span><textarea rows="6" data-f="rueckblick"></textarea></label>
        <div class="grid-2">
          <label class="field"><span>Jahresbericht (PDF)</span><input type="file" accept="application/pdf" data-pdf="pdf_bericht"><small class="muted" data-pdf-name="pdf_bericht"></small></label>
          <label class="field"><span>Belegübersicht (PDF)</span><input type="file" accept="application/pdf" data-pdf="pdf_belege"><small class="muted" data-pdf-name="pdf_belege"></small></label>
        </div>
      </div>
      <div class="grid-2 mt">
        <div class="note-box"><strong>Sponsoren</strong> sehen den Bericht über ihren Login – jederzeit, sobald er freigegeben ist.</div>
        <div class="note-box"><strong>Squadra 3</strong> bekommt den Bericht am Saisonende per E-Mail (nur bestätigte Mitglieder mit Häkchen „Jahresbericht“).</div>
      </div>
      <div class="btn-row mt">
        <button type="button" class="btn btn-dark" data-save>Speichern</button>
        <button type="button" class="btn btn-red" data-toggle-release></button>
        <button type="button" class="btn btn-outline" data-send-report>Jahresbericht an Squadra 3 senden</button>
        <a class="btn btn-outline" href="/bericht/" target="_blank">Vorschau als Sponsor</a>
      </div>
      <p class="muted small" data-mail-info></p>
    </section>

    <section data-panel="zugaenge" hidden>
      <h1 class="h1">Sponsoren &amp; Admins</h1>
      <div class="grid-2 align-start">
        <div class="card flush"><div class="table-box plain"><table class="table"><thead><tr><th>Name / Firma</th><th>E-Mail</th><th>Rolle</th><th></th></tr></thead><tbody data-profiles></tbody></table></div></div>
        <form class="card form" data-invite-form>
          <h2 class="h3">Zugang einladen</h2>
          <label class="field"><span>E-Mail</span><input type="email" name="email" required></label>
          <label class="field"><span>Name / Firma</span><input name="firma" required></label>
          <label class="field"><span>Rolle</span><select name="rolle"><option value="sponsor">Sponsor – Login für den Ausgabenbericht</option><option value="admin">Admin – darf alles bearbeiten</option></select></label>
          <button class="btn btn-dark" type="submit">Einladung senden</button>
          <p class="muted small">Die Person bekommt eine E-Mail und legt beim ersten Login ihr Passwort fest.</p>
        </form>
      </div>
    </section>

    <section data-panel="squadra" hidden>
      <div class="section-head">
        <h1 class="h1">Squadra 3</h1>
        <div class="btn-row">
          <button type="button" class="btn btn-red" data-publish>Wall of Fame veröffentlichen</button>
          <a class="btn btn-outline" href="/wall-of-fame/druck/" target="_blank">Wall of Fame drucken</a>
          <button type="button" class="btn btn-outline" data-export>CSV</button>
        </div>
      </div>
      <div class="kpis small-kpis">
        <div class="kpi dark"><span>Mitglieder bestätigt</span><strong data-sk="gesamt">–</strong></div>
        <div class="kpi"><span>Freunde / Fans</span><strong data-sk="freund">–</strong></div>
        <div class="kpi"><span>Unterstützer</span><strong data-sk="unterstuetzer">–</strong></div>
        <div class="kpi"><span>Fotos warten auf Prüfung</span><strong data-sk="pruefen">–</strong></div>
      </div>
      <div class="note-box">So läuft’s: Anmeldung → E-Mail-Bestätigung (unter 16: durch die Eltern) → ihr prüft das Foto → „Wall of Fame veröffentlichen“. Namen erscheinen als Vorname + Initiale. Fotos nur, wenn ihr sie freigebt. „Ausblenden“ nimmt jemanden von der Wall, ohne die Anmeldung zu löschen.</div>
      <div class="row mt">
        <div class="pill-row compact" data-sfilter>
          <button type="button" class="pill is-active" data-f="alle">Alle</button>
          <button type="button" class="pill" data-f="pruefen">Foto prüfen</button>
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
          <p class="muted small">Für Freunde, die ihr selbst eintragt – z. B. am Rennzelt oder in der Schule. Ohne E-Mail bekommen sie keine Post, stehen aber auf der Wall of Fame.</p>
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
          <label class="check"><input type="checkbox" name="minderjaehrig"><span>Unter 16</span></label>
          <label class="check"><input type="checkbox" name="einwilligung" required><span>Die Einwilligung für Name und Foto auf der Wall of Fame liegt vor (bei unter 16: von den Eltern).</span></label>
          <button class="btn btn-dark" type="submit">Hinzufügen</button>
        </form>
        <form class="card form" data-message-form>
          <h2 class="h3">Nachricht an die Squadra</h2>
          <p class="muted small">Geht an alle bestätigten Mitglieder mit Häkchen „Renn-Updates“ (<strong data-updates-count>0</strong>).</p>
          <label class="field"><span>Betreff</span><input name="betreff" required maxlength="150" placeholder="Nächstes Rennen: Lonato, 14. März!"></label>
          <label class="field"><span>Text</span><textarea name="text" rows="7" required maxlength="5000"></textarea></label>
          <div class="btn-row"><button class="btn btn-outline" type="button" data-msg-test>Testmail an uns</button><button class="btn btn-red" type="submit">An alle senden</button></div>
        </form>
      </div>
    </section>

    <section data-panel="sponsorwall" hidden>
      <div class="section-head"><h1 class="h1">Sponsoren-Wall</h1><button type="button" class="btn btn-red" data-publish>Wall of Fame veröffentlichen</button></div>
      <p class="muted">Sponsoren legen ihren Eintrag im eigenen Login an (Website + mindestens ein Social-Media-Kanal sind Pflicht). Nach jeder Änderung muss der Eintrag hier neu freigegeben werden. Das Logo-Laufband auf der Startseite bleibt davon unberührt – es wird weiter im CMS gepflegt.</p>
      <div class="member-grid" data-sponsorwall></div>
      <div class="card mt">
        <h2 class="h3">Eintrag für einen Sponsor anlegen oder bearbeiten</h2>
        ${sponsorWallForm(true)}
      </div>
    </section>

    <section data-panel="einladen" hidden>
      <h1 class="h1">Squadra 3 einladen</h1>
      <p class="lead">Instagram erlaubt es nicht, Follower automatisch irgendwo einzutragen oder allen eine Nachricht zu schicken. So erreicht ihr trotzdem alle:</p>
      <div class="grid-2 align-start">
        <div class="card">
          <h2 class="h3">1 · Link in Luigis Bio</h2>
          <div class="copy-box" data-copy-src data-invite-link></div>
          <button class="btn btn-outline btn-sm" data-copy-btn>Kopieren</button>
          <h2 class="h3 mt">2 · Hashtags</h2>
          <div class="copy-box" data-copy-src>#SquadraLBC3 #LBC3 #Squadra3</div>
          <button class="btn btn-outline btn-sm" data-copy-btn>Kopieren</button>
          <h2 class="h3 mt">3 · So geht’s auf Instagram</h2>
          <ul class="lines small">
            <li><strong>Story mit Link-Sticker</strong> auf den Link oben – und als Highlight „Squadra 3“ speichern.</li>
            <li><strong>Beitrag fixieren</strong> (oben im Profil anpinnen) mit dem Text rechts.</li>
            <li><strong>QR-Code</strong>: Profil → Teilen → QR-Code. Ausdrucken und am Zelt aufhängen.</li>
            <li><strong>Neue Follower</strong>: kurze DM mit dem Text unten – einzeln, nicht als Massennachricht.</li>
            <li><strong>Wöchentlich</strong> neue Mitglieder in der Story begrüßen („Benvenuti in der Squadra!“).</li>
          </ul>
        </div>
        <div class="card" data-invite-texts></div>
      </div>
    </section>
  </main>
</div>`;
  return bareLayout({ title: 'Team-Bereich', body, ctx, scripts: ['/assets/js/auth.js'], bodyClass: 'page-app' });
}
