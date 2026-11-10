<!-- © 2026 LBC3 -->
# Anfragen-Kartei mit Spam-Prüfung – Abschluss

Stand: 10.11.2026 · **Noch nicht live** – PR #9 (Branch `kontakt-anfragen-kartei`), Netlify-Vorschau https://deploy-preview-9--luigi-catuogno.netlify.app · Verantwortlich: Head of R&D LBC3

## Ziel
Alle Anfragen von Dritten aus dem Kontaktformular (Sponsoring, Partnermappe, Presse, Sonstiges) liegen in einer Kartei im Team-Bereich. Jede Anfrage wird geprüft: grünes Label **OK** oder rotes Label **Spam**. Spam landet nur still in der Kartei, ohne E-Mail. Die Arbeit muss vollständig rückgängig zu machen sein. (Vorgaben des Eigentümers, 10.11.2026)

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| Datenbank | `supabase/migrations/005_kontakt_anfragen.sql`: neue Tabelle `kontakt_anfragen`. Lesen und Schreiben nur mit Rolle admin (RLS, gleiches Muster wie Squadra Tre), kein Zugriff für `anon`. Nur Ergänzung, nichts Bestehendes geändert. |
| Spam-Prüfung | `netlify/functions/_lib/spam.mjs`: Punkte je Merkmal, ab 5 Punkten Spam. Merkmale: Lockfeld (10), in unter 3 s abgeschickt (4), Seite über 24 h offen oder ohne Zeitstempel (2), Links (1, ab 3 Links 4; E-Mail-Adressen zählen nicht), Link im Namen (3), Werbe-Wörter (eindeutige 2, mehrdeutige 1, zusammen höchstens 3), fremde Schrift (4), Wegwerf-Adresse (3), sehr kurz (1), nur Großbuchstaben (1), dritte OK-Anfrage derselben Adresse in 24 h (3). Wörter wie „Ranking“, „Sponsor“, „Marketing“ zählen bewusst nicht. |
| Kontaktformular | `netlify/functions/kontakt.mjs`: speichert jede Anfrage zusätzlich. OK → E-Mail ans Team und Eingangsbestätigung wie bisher. Spam → nur Kartei, keine E-Mail. Kartei nicht erreichbar oder langsamer als 2,5 s → E-Mail wie bisher (bei Spam mit „[Verdacht auf Spam]“). Lockfeld-Treffer höchstens 200 pro Tag. |
| Team-Bereich | Reiter **Anfragen** (`scripts/templates/secure.mjs`, `public/assets/js/auth.js`): Karten mit Label, Datum, Anliegen, Sprache, Name, Firma, E-Mail, Nachricht und Prüfgründen. Label per Klick umschalten, „Erledigt“, „Löschen“. Filter Offen/OK/Spam/Erledigt/Alle auf dem Server. Zahl offener Anfragen im Menü. |
| Aussehen | `public/assets/css/site.css`: `.lbc3-label-ok` Grün #14532D auf #DDF1E3 (7,7 : 1), `.lbc3-label-spam` Weiß auf Rot #B00E28 (7,1 : 1). Spam-Karten mit rotem Rand links. |
| Speicherfristen | `netlify/functions/anfragen-aufraeumen.mjs`, nachts 02:20 UTC: Spam 30 Tage nach dem Setzen des Labels, erledigte Anfragen 12 Monate nach „Erledigt“, alle Anfragen höchstens 24 Monate nach Eingang. |
| Datenschutzerklärung | `content/einstellungen/site.json`, DE/EN/IT/FR: Speicherung bei Supabase, gespeicherte Felder, automatische Spam-Prüfung, keine Weiterleitung bei Spam, Fristen (Abschnitte 4, 7, 8). |
| Tests | `tests/anfragen.test.mjs` (26 Tests): Spam-Regeln mit echten und falschen Beispielen, Kontaktformular mit nachgestellter Datenbank (OK, Spam, Lockfeld, Datenbank kaputt, Datenbank hängt), Zugriffsregel, Gegen-Skript, Reiter, Fristen, Datenschutztext in 4 Sprachen. |

## Test mit den zwei echten E-Mails (10.11.2026)
Im Postfach lagen genau zwei Anfragen über das Kontaktformular (gesucht per Gmail):

| Eingang | Absender | Inhalt | Ergebnis vorher | Ergebnis jetzt |
|---|---|---|---|---|
| 04.11.2026 | „Indira Switzer“, domains@search-luigi-catuogno.com | Angebot, die Website „in Googles Suchindex einzutragen“, Link auf indexdomain.live | OK (1 Punkt) – **Fehler** | **Spam** (11 Punkte) |
| 07.11.2026 | „MichaelSeict“, Adresse mit langer Ziffernfolge, Firma „Google“ | sinnlose Buchstabenfolgen | OK (1 Punkt) – **Fehler** | **Spam** (7 Punkte) |

Fehler-Lernschleife: Die Prüfung hätte beide durchgelassen. Neue Regeln:
- Absender-Domain ahmt die eigene Website nach (4 Punkte)
- Index-/Eintrags-Angebote als eindeutige Werbe-Wendungen
- weitere Endungen (.live, .click, .icu, .pro, .store)
- Nachricht ohne ein einziges häufiges Kurzwort in DE/IT/EN/FR und mit sehr langen Wörtern (3 Punkte)
- Name ohne Leerzeichen zusammengeschrieben (2 Punkte)
- lange Ziffernfolge in der Adresse (1 Punkt)

Je ein Regressionstest und ein Gegentest gegen Fehlalarme sind dazugekommen; die 14 Beispiele der unabhängigen Prüfung sind unverändert. Die zwei Einträge hat der Eigentümer am 10.11.2026 per SQL eingetragen (Kennzeichen „aus dem Postfach übernommen“), weil das LBC3-Supabase von hier nicht erreichbar ist.

## Rückgängig machen
1. Code: PR zurücknehmen (Revert) oder auf Netlify die vorige Version veröffentlichen. Ohne Tabelle schickt das Formular automatisch alles per E-Mail, so wie vorher.
2. Datenbank: `supabase/migrations/005_kontakt_anfragen_rueckgaengig.sql` im SQL-Editor ausführen. Das löscht die Tabelle samt Inhalt; vorher bei Bedarf als CSV sichern.
3. Nicht rückgängig zu machen: Was im Team-Bereich gelöscht wird, ist weg.

## Geprüft
- `npm test`: 111 grün, 0 Fehler, 5 bekannte Abbrüche (Squadra-Functions, vorher schon so).
- Build: 189 Seiten, Reiter „Anfragen“ im Team-Bereich.
- Netlify-Vorschau für PR #9 gebaut.
- Unabhängige Agenten-Prüfung: zuerst Ampel GELB, nach den Korrekturen GRÜN. Behoben:
  - 1: Ein alter Zeitstempel allein machte echte Anfragen fast zu Spam → nur noch 2 Punkte.
  - 2: Werbe-Wörter trafen echte Partner (Agentur, Bank, Groupe Casino) → aufgeteilt, höchstens 3 Punkte.
  - 3: E-Mail-Adressen zählten als Links → werden nicht mehr gezählt.
  - 4: Speicherfrist unvollständig → Höchstfrist 24 Monate, Spam-Frist ab dem Setzen des Labels.
  - 5: Spam-Flut konnte echte Anfragen aus der Liste drängen → Filter auf dem Server.
  - 6: Eine hängende Datenbank verhinderte die E-Mail → Zeitlimit 2,5 s.
  - 7: Wiederholungszähler ließ sich missbrauchen → zählt nur OK-Anfragen.
  - 8: Bei vollem Tageslimit gingen Anfragen ganz verloren → Limit nur für Lockfeld-Treffer.
  - 10: Datenschutztext unvollständig → gespeicherte Felder genannt.
  - 11: Fokus und Vorlesetext fehlten → Fokus bleibt erhalten, Zusatz „offen“.
  - 12: CSS-Ordnung → aufgeräumt.
  - A–C: Spalten werden auch bei bestehender Tabelle nachgezogen, Höchstfrist gilt für alle, eigenes Lockfeld-Merkmal.

## Grenzen (ehrlich)
- Die Spam-Prüfung sortiert vor, sie urteilt nicht. Eine falsch als Spam eingestufte Anfrage löst keine E-Mail aus; deshalb im Reiter regelmäßig den Filter „Spam“ ansehen.
- Gespeichert wird erst ab dem Live-Gang. Ältere Anfragen liegen nur im Postfach contact@luigi-catuogno.com.
- Ein russischer Werbetext ohne Link bleibt OK (4 Punkte) und kommt per E-Mail; das ist gewollt, damit echte ausländische Anfragen nicht verschwinden.

## Quellen
- Supabase Docs, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security (abgerufen 10.11.2026)
- PostgREST, Filter/Operatoren: https://docs.postgrest.org/en/stable/references/api/tables_views.html (abgerufen 10.11.2026)
- Netlify Docs, Scheduled Functions: https://docs.netlify.com/build/functions/scheduled-functions/ (abgerufen 10.11.2026)
- MDN `AbortSignal.timeout()`: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static (abgerufen 10.11.2026)
- OWASP, Cross Site Scripting Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html (abgerufen 10.11.2026)
- WCAG 2.2, 1.4.3 Kontrast und 2.4.3 Fokus-Reihenfolge: https://www.w3.org/TR/WCAG22/
- DSGVO Art. 5 Abs. 1 lit. e (Speicherbegrenzung), Art. 22, Art. 25: https://eur-lex.europa.eu/eli/reg/2016/679/oj

## Offene Punkte
- Erledigt 10.11.2026: Tabelle im LBC3-Supabase angelegt und die zwei E-Mails eingetragen (beide Spam) – vom Eigentümer ausgeführt mit `kartei-anlegen-und-zwei-anfragen.sql`.
- **Live-Gang** erst nach „freigeben“ und angelegter Tabelle.
- **LBC3 Rechts-Recherche-Team:** Datenschutztext (Abschnitte 4, 7, 8), Fristen 30 Tage / 12 Monate / 24 Monate und die Frage nach Art. 22 DSGVO (automatische Einstufung ohne Weiterleitung) bestätigen – NICHT VERIFIZIERT.
- IT/FR-Text der Datenschutzerklärung von Muttersprachlern gegenlesen – NICHT VERIFIZIERT.
- Eigenes Ticket: Grenze pro IP-Adresse für das Kontaktformular (Befund 9; Fluten mit OK-Einträgen und Inhalts-Spam bleibt möglich).
- Prüfkette (GitHub Actions) weiterhin nicht eingerichtet.
