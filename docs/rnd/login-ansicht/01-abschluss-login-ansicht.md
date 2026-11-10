<!-- © 2026 LBC3 -->
# Anmeldeseite: Admin-Login nur auf Team-Geräten, Partner-Ansicht im Team-Bereich – Abschluss

Stand: 10.11.2026 · **Live seit 10.11.2026, 13:37 Uhr** (PR #8, Commit 5706c95, Netlify-Deploy 6af30ff0, Freigabe des Eigentümers 13:34) · Verantwortlich: Head of R&D LBC3

## Ziel
Die Anmeldeseite zeigt den Admin-Bereich nur noch auf den Geräten des Eigentümers und des Teams, dort ohne den Partner-Login. Alle anderen sehen nur den Partner-Login. Damit das Team trotzdem sieht, wie der Partner-Login aussieht, gibt es im Team-Bereich eine Vorschau (Vorgabe des Eigentümers, 10.11.2026).

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| Anmeldeseite `/login/` (DE, IT, EN, FR) | `scripts/templates/secure.mjs`: Reiter „Partner / Team-Admin“ entfernt. Seite und Vorschau entstehen aus derselben Vorlage (`loginBox`, `loginLayout`) und sehen deshalb immer gleich aus. |
| Team-Geräte | `public/assets/js/auth.js`: Ist der Browser als Team-Gerät markiert (`localStorage` `lbc3-team-geraet`), erscheint „Team / Admin“ mit dem Team-Hinweis statt des Partner-Logins. |
| Weiterleitung | Admins landen nach dem Login immer in `/team/`, auch über den Partner-Login auf einem neuen Gerät. Partner landen wie bisher in `/bericht/` in ihrer Sprache. Einladung, Login-Link und Passwort zurücksetzen laufen unverändert. |
| Echter Blick als Partner | `/login/?ansicht=partner` zeigt auch auf Team-Geräten den Partner-Login und leitet nicht automatisch weiter. |
| Team-Bereich | Neuer Reiter **Partner-Ansicht** mit Vorschau der Anmeldeseite in DE/IT/EN/FR (Sprache umschaltbar, ohne Funktion, für Screenreader als „Vorschau Partner-Login“ benannt). Dazu ein Link zum Ausgabenbericht (Admins sehen dort zusätzlich Entwürfe) und das Häkchen „Dieses Gerät ist ein Team-Gerät“. Oben steht ein Hinweis mit Knopf „Als Team-Gerät markieren“, solange das Gerät nicht markiert ist. |
| Aussehen | `public/assets/css/site.css`: Rahmen für die Vorschau (`.lbc3-pv`) mit Band „Vorschau“ und Hinweis-Kasten. |
| Tests | `tests/login-ansicht.test.mjs` (21 Prüfungen): keine Reiter mehr, Formular vollständig in allen Sprachen, Logik in auth.js, Vorschau in 4 Sprachen ohne echte Login-Kennungen, Häkchen und Hinweis. |

## Bedienung
- **Eigenes Gerät markieren:** einmal anmelden → Team-Bereich → Knopf „Als Team-Gerät markieren“ (oder Reiter „Partner-Ansicht“ → Häkchen). Das muss je Handy, Tablet und Computer und je Browser einmal gemacht werden.
- **Neues Gerät:** einfach über den Partner-Login anmelden. Admins kommen trotzdem in den Team-Bereich.
- **Fremdes oder geteiltes Gerät:** nicht markieren.
- **Browser-Speicher gelöscht oder privates Fenster:** Die Markierung ist weg, also neu markieren. Im privaten Fenster ist sie unter Umständen gar nicht möglich; der Team-Bereich meldet das.

## Sicherheit und Datenschutz
- **Reine Anzeige, kein Schutz:** Wer sich anmeldet, bekommt nur die Rechte seiner Rolle in Supabase (`profiles.rolle`, Row-Level-Security). Das ist unverändert.
- **Keine neuen Daten:** Neu ist nur ein Eintrag im Browser des Geräts. Kein Cookie, kein neuer Serveraufruf, nichts in der Datenbank.
- **CSP eingehalten:** kein Inline-JavaScript.

## Geprüft
- `npm test`: 98 grün, 0 Fehler, 5 bekannte Abbrüche (Squadra-Functions R1, R2, R4, R5 – vorher schon so).
- Build: 189 Seiten.
- Netlify-Vorschau (PR #8): Deploy fertig.
- Unabhängige Agenten-Prüfung: Ampel **GRÜN**, nichts musste vor dem Live-Gang behoben werden. Übernommen wurden:
  - H1: Die Vorschau ist für Screenreader jetzt benannt; `inert` sitzt auf einem inneren Element.
  - H2: Der Knopftext zum Ausgabenbericht ist präzisiert.
- Live-Deploy: fertig (Netlify-Status „ready“), 27 Functions aktiv, Secret-Scan ohne Fund (426 Dateien).
- **Im Browser nicht von hier geprüft – NICHT VERIFIZIERT.** Bitte einmal ansehen:
  1. `/login/` auf einem fremden Gerät oder im privaten Fenster: nur Partner-Login.
  2. Eigenes Gerät markieren, dann `/login/`: nur Admin-Login.
  3. Team-Bereich → „Partner-Ansicht“: Vorschau in allen vier Sprachen.

## Quellen
- WHATWG HTML, globales Attribut `inert`: https://html.spec.whatwg.org/multipage/interaction.html#the-inert-attribute (abgerufen 10.11.2026)
- MDN `inert`: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert (abgerufen 10.11.2026)
- MDN Web Storage (`localStorage`): https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage (abgerufen 10.11.2026)
- WAI-ARIA 1.2, Rolle `img`: https://www.w3.org/TR/wai-aria-1.2/#img (abgerufen 10.11.2026)
- OWASP Authorization Cheat Sheet (Rechte serverseitig prüfen): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (abgerufen 10.11.2026)

## Offene Punkte
- Ansicht im echten Browser (siehe oben) – NICHT VERIFIZIERT.
- H3: Auf Team-Geräten blitzt beim Laden kurz der Partner-Hinweis auf. Reine Anzeige; bei Bedarf als kleine Korrektur.
- H4: Der Übersetzungsschlüssel `p_tab_partner` wird nicht mehr benutzt und kann bei Gelegenheit entfernt werden.
- H5: Den Rauchtest um drei Fälle ergänzen, sobald die Prüfkette steht: ohne Markierung kein Admin-Label, mit Markierung Label sichtbar, `?ansicht=partner` ohne Weiterleitung.
- H6: Das LBC3 Rechts-Recherche-Team soll kurz bestätigen, dass der allgemeine Satz zur Browser-Speicherung in der Datenschutzerklärung die Team-Markierung abdeckt – NICHT VERIFIZIERT.
- Prüfkette (GitHub Actions) ist weiterhin nicht eingerichtet.
