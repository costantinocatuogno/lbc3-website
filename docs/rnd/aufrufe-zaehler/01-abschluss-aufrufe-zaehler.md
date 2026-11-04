<!-- © 2026 LBC3 -->
# Aufrufzähler für alle Bauteile der Website – Abschluss

Stand: 05.11.2026 · **Live seit 05.11.2026, 00:09 Uhr** (PR #3, Commit 88465cf, Netlify-Deploy 6aebbafe) · Verantwortlich: Head of R&D LBC3

## Ziel
Im Team-Bereich sehen, wie oft jedes Bauteil der Website aufgerufen wurde – Seiten, Artikel, Galerie-Seiten, Bilder und Videos. Nur für Admins sichtbar, nicht öffentlich (Vorgabe des Eigentümers, 04.11.2026).

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| Bauteil-Liste | `scripts/lib/bauteile.mjs` + `scripts/build.mjs`: beim Build entsteht `/bauteile.json` aus den fertigen deutschen Seiten – heute 290 Bauteile (9 Seiten, 7 Artikel, 23 Galerie-Seiten, 232 Bilder, 19 Videos). Neue Bilder/Videos kommen automatisch dazu. |
| Zählung Bilder/Videos | `public/assets/js/site.js`: Bild = in der Großansicht geöffnet; Video = selbst gestartet und bis zum Ende angesehen. Nur Videos mit Bedienelementen, nicht das Intro und nicht die stummen Vorschauen. Pro Seitenaufruf je Datei und Art höchstens einmal. „Meine eigenen Besuche nicht mitzählen“ gilt auch hier. |
| Server | `netlify/functions/medien.mjs` (`/api/medien`): POST öffentlich, nimmt nur Dateien aus `bauteile.json` derselben Fassung an (Live oder Vorschau), höchstens 20 000 Ereignisse pro Tag; GET nur für Admins, Zeitraum lückenlos nach Kalendertagen. `medien-verdichten.mjs`: nachts 01:40 Tageszahlen bilden (jeder Tag genau einmal), Einzel-Ereignisse löschen. Rechenlogik in `_lib/medien-zahlen.mjs`. |
| Seiten und Artikel | aus der bestehenden Besucherzählung (`/api/besuch`) – keine neuen Daten; alle Sprachfassungen werden zusammengezählt (`/it/news/x/` = `/news/x/`). |
| Team-Bereich | Reiter **Aufrufe** (`scripts/templates/secure.mjs`, `public/assets/js/auth.js`): Summen je Art, Tabelle aller Bauteile mit DE/IT/EN/FR, bei Videos „zu Ende“ mit Prozent; Zeitraum 7/30 Tage/12 Monate; Filter nach Art, Suche, „nur ohne Aufrufe“; CSV-Download. |
| Datenschutzerklärung | `content/einstellungen/site.json`: ein Satz zur Bild-/Video-Zählung in DE, EN, IT, FR (direkt nach dem Satz zu den Partner-Klicks). |
| Tests | `tests/aufrufe.test.mjs`: Adressen/Sprachen zusammenfassen, Netlify-Bildadressen, Bauteil-Liste (Intro zählt nicht, keine Doppelten), nur bekannte Dateien, keine persönlichen Felder gespeichert, Zusammenfassen/Addieren, Einbau, Datenschutz-Satz in allen Sprachen. |

## Datenschutz durch Technik
Gespeichert wird je Ereignis nur: Datei, Art (geöffnet/gestartet/zu Ende), Sprache, Tag – keine Uhrzeit. Keine IP-Adresse, keine Cookies, nichts im Browser. Gleiches Muster wie der bestehende Partner-Klickzähler. Rechtliche Bestätigung durch das LBC3 Rechts-Recherche-Team steht aus (siehe Offene Punkte).

## Grenzen
- Bilder und Videos zählen erst ab Live-Gang; frühere Aufrufe lassen sich nicht ermitteln.
- Ein Reel, das nach dem vorigen automatisch weiterläuft, zählt als gestartet.
- Seiten-Zahlen hängen an der bestehenden Besucherzählung (Roboter und Team-Bereich ausgenommen).

## Geprüft
- `npm test`: alle neuen Tests grün. Die 5 abgebrochenen Squadra-Tests (R1, R2, R4, R5) waren vorher schon so.
- Build: 189 Seiten, 290 Bauteile.
- Live-Deploy: fertig, Functions `medien` und `medien-verdichten` (01:40) aktiv, Secret-Scan ohne Fund.
- Netlify-Vorschau: Deploy fertig, Functions `medien` und `medien-verdichten` (01:40) aktiv, Secret-Scan ohne Fund.
- Unabhängige Agenten-Prüfung (Ampel GELB, 05.11.2026), alle Befunde behoben:
  - A: Nach abgebrochener Verdichtung wurde doppelt gezählt → jeder Tag wird nur einmal verdichtet.
  - B: Bei Zeitumstellung war ein Tag doppelt oder fehlte → Zeitraum nach Kalendertagen.
  - C: Die Vorschau nutzte die Bauteil-Liste der Live-Seite, kein erneuter Abruf nach Fehler → eigene Fassung, 1 Minute Pause nach Fehler.
  - D: Keine Mengenbegrenzung → Tagesgrenze 20 000 Ereignisse.
  - E: CSV-Formeln → werden entschärft.
  - F: Uhrzeit im Speicherschlüssel → nur Zufallswert.
  - Filter haben jetzt `aria-pressed`.
- `npm test` nach den Korrekturen: 70 grün, 0 Fehler, 5 bekannte Abbrüche.

## Quellen
- W3C, Beacon API (`navigator.sendBeacon`): https://www.w3.org/TR/beacon/ (abgerufen 05.11.2026)
- WHATWG HTML, Media-Events `play`/`ended`: https://html.spec.whatwg.org/multipage/media.html#mediaevents (abgerufen 05.11.2026)
- Netlify Docs, Blobs: https://docs.netlify.com/build/data-and-storage/netlify-blobs/ (abgerufen 05.11.2026)
- Netlify Docs, Scheduled Functions: https://docs.netlify.com/build/functions/scheduled-functions/ (abgerufen 05.11.2026)
- DSGVO Art. 25 (Datenschutz durch Technik): https://eur-lex.europa.eu/eli/reg/2016/679/oj

## Offene Punkte
- LBC3 Rechts-Recherche-Team: neuen Satz in der Datenschutzerklärung und die Zählung bestätigen – NICHT VERIFIZIERT.
- IT/FR-Satz der Datenschutzerklärung von Muttersprachlern gegenlesen – NICHT VERIFIZIERT.
- Reiter „Aufrufe“ nach dem Live-Gang einmal mit Admin-Login ansehen (konnte ohne Login nicht geprüft werden).
- Prüfkette (GitHub Actions) ist weiterhin nicht eingerichtet.
- Die bestehende Besucherzählung (`besuch.mjs`, `besuch-verdichten.mjs`, `klick.mjs`) hat dieselben Schwachstellen A, B und D. Vorschlag: eigener kleiner Korrektur-Block.
- Netlify-Ratenbegrenzung pro IP als zusätzlicher Schutz prüfen – NICHT VERIFIZIERT, ob im Tarif verfügbar.
