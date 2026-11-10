<!-- © 2026 LBC3 -->
# Squadra Tre: alle Registrierten als Fan/Unterstützer + Freigabe Simona Lardaro – Abschluss

Stand: 10.11.2026 · **Live seit 10.11.2026, 13:37 Uhr** (PR #7, Commit fd85219; ausgerollt mit Netlify-Deploy 6af30ff0 zusammen mit PR #8) · Verantwortlich: Head of R&D LBC3

## Ziel
Vorgabe des Eigentümers (10.11.2026):
1. Im Team-Bereich sollen alle, die sich bei Squadra Tre registriert haben, als **Fan** oder **Unterstützer** erscheinen und gezählt werden – auch für künftige Anmeldungen automatisch. Entscheidung: nur der Team-Bereich (Variante a); öffentliche Wall of Fame und E-Mails bleiben bei „nur bestätigt“.
2. Simona Lardaro (Cousine des Eigentümers, volljährig) freigeben – „genau so wie die anderen“. Sie hat dem Eigentümer gegenüber zugestimmt.

## Ursache
Jede Anmeldung wurde bereits als „freund“ (Fan) gespeichert. Die Kennzahlen im Team-Bereich zählten aber nur Anmeldungen, deren Bestätigungslink geklickt war. Unbestätigte erschienen daher nicht bei „Fans“.

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| `public/assets/js/auth.js` | Kennzahlen über **alle** Registrierten; Hilfsregel `istUnterstuetzer` – alles, was nicht ausdrücklich „unterstuetzer“ ist, gilt als Fan (auch alte/leere Einträge); Filter und Etikett „Fan“ nach derselben Regel. E-Mail-Updates zählen weiter nur bestätigte. |
| `scripts/templates/secure.mjs` | Kennzahl „Mitglieder registriert“ mit Zeile „davon unbestätigt: X“; „Fans“ statt „Freunde / Fans“; Filterknopf „Fans“. |
| `public/assets/css/site.css` | Darstellung der kleinen Zeile in der Kennzahl (Kontrast AA). |
| `netlify/functions/squadra-wochenbericht.mjs` | „Fan“ statt „Freund“; Gesamtzahl als „gesamt (bestätigt)“ beschriftet. |
| `tests/squadra-fans.test.mjs` | 7 Tests: Zählung über alle, Fan-Regel (ausgeführt), Beschriftungen, Wochenbericht; Verhaltenstest: Wall of Fame und Rundmails schließen unbestätigte weiter aus. |

Unverändert (bewusst): Wall of Fame, Updates- und Jahresbericht-Mails nur für bestätigte Mitglieder (Datenschutz-Umbau 02.11.2026, Double-Opt-in als Einwilligungsnachweis).

## Freigabe Simona Lardaro (Datenbank, 10.11.2026)
- Vorher: volljährig (18+), Fan, kein Foto, **unbestätigt**, Wall-Häkchen nicht gesetzt. Alle anderen 12 Mitglieder: bestätigt und auf der Wall.
- Gesetzt wie bei den anderen: `optin_bestaetigt = true`, `bestaetigt_am`, `wand_optin = true`, `einwilligung_am`, `einwilligung_nachweis` = „Mündlich gegenüber Eigentümer (Cousine) bestätigt, Freigabe durch Eigentümer 10.11.2026“.
- Nicht verändert: E-Mail-Einstellungen (Updates/Jahresbericht) – bleiben, wie sie sie gewählt hat.
- Der Live-Build lief nach der Freigabe; Anzeige auf der Wall: NICHT VERIFIZIERT von hier (Netzwerksperre). Falls sie fehlt: Team-Bereich → „Wall of Fame veröffentlichen“.

## Geprüft
- `npm test`: 85 grün, 0 Fehler, 5 bekannte Abbrüche (Squadra-Functions, vorher schon so).
- Build: 189 Seiten. Netlify-Vorschau zu PR #7 grün.
- Unabhängige Agenten-Prüfung: **Ampel GRÜN**. Hinweise umgesetzt: „Fan“-Etikett neutral statt grün (nicht mit „bestätigt“ verwechseln), Wochenbericht „gesamt (bestätigt)“, echter Verhaltenstest für Wall/Mails.
- Live-Deploy 6af30ff0: „ready“, 27 Functions, Secret-Scan ohne Fund.

## Quellen
- DSGVO Art. 7 Abs. 1 (Nachweis der Einwilligung): https://eur-lex.europa.eu/eli/reg/2016/679/oj (abgerufen 10.11.2026)
- DSGVO Art. 25 (Datenschutz durch Technik): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- WCAG 2.2, 1.4.3 Kontrast (Minimum): https://www.w3.org/TR/WCAG22/#contrast-minimum
- Supabase-Zugriff: Datenbank-Projekt „lbc3-website“ (Organisation separat von PiStop)

## Offene Punkte
- LBC3 Rechts-Recherche-Team: kurz bestätigen, dass ein mündlich gegenüber dem Eigentümer erteiltes Einverständnis (mit Vermerk) als Nachweis für Simonas Wall-Eintrag reicht – NICHT VERIFIZIERT.
- Team-Bereich nach dem Live-Gang einmal mit Admin-Login ansehen (Kennzahlen, „davon unbestätigt“).
- Prüfkette (GitHub Actions) weiterhin nicht eingerichtet.
