# Squadra Tre – Datenschutz-Umbau (Stand 02.11.2026)

Umsetzung der Anforderungen L1–L17 der Rechtsabteilung für Anmeldung, Eltern-Zustimmung und Wall of Fame.
Branch: `squadra-dsgvo`. **Erst Migration 004 ausführen, dann mergen** – sonst schlägt die Anmeldung fehl
(die neuen Spalten fehlen noch).

## Was sich ändert

**Für Fans (Formular auf /squadra-tre/)**
- Drei Altersstufen: *18 oder älter*, *16 oder 17*, *unter 16*. Vorausgewählt ist „Freund“; „Unterstützer“ geht erst ab 18.
- Unter 16: Eltern-E-Mail ist Pflicht. Das Kind bekommt nur eine Info-Mail, die Eltern einen Link zur Eltern-Seite.
- 16/17: bestätigen selbst. Eltern-E-Mail nur, wenn ein Foto hochgeladen wird (Foto erscheint nur mit Eltern-Zustimmung).
- Instagram-Feld nur ab 18 (Server speichert bei Minderjährigen nie einen Instagram-Namen).
- Neues Feld „Spitzname“ (optional, max. 20 Zeichen) – erscheint erst nach Freigabe durch das Team.
- Bestätigen per Knopf auf einer Seite (nicht mehr beim bloßen Öffnen des Links). Links gelten 7 Tage.
- Jede E-Mail enthält „Daten ändern oder löschen“ (Foto entfernen, von der Wall nehmen, keine E-Mails, austreten).
- Fotos: Standort-/Kameradaten (EXIF, XMP, Kommentare) werden auf dem Server entfernt.

**Für das Team (Team-Bereich → Squadra Tre)**
- Neue Filter „Name prüfen“ und „Eltern offen“, Anzeige der Altersstufe und der Eltern-Zustimmung.
- Knopf „✓ Name freigeben“ (Einwortnamen und Spitznamen) – wie die Foto-Freigabe.
- Knopf „Eltern-Bestätigung anfordern“ (Minderjährige): schickt den Eltern einen frischen Link (7 Tage).
- „Löschen“ entfernt auch den Pin und veröffentlicht die Wall sofort neu.
- „Freund hinzufügen“: Pflichtfeld „Nachweis der Einwilligung“, Altersstufe, bei Minderjährigen Eltern-E-Mail
  (Eltern-Mail geht automatisch raus; Fotos von Minderjährigen werden nicht automatisch freigegeben).
- Druckansicht `/wall-of-fame/druck/` lädt Namen und Fotos erst nach dem Admin-Login (die Seite selbst enthält keine Daten).

**Wer erscheint öffentlich auf der Wall** (`oeffentlicheWall()` in `netlify/functions/_lib/squadra-rules.mjs`)
- Bestätigt, nicht ausgeblendet.
- Name: nur mit Häkchen „Name auf der Wall“ und nur bei zwei Wörtern – oder nach Freigabe durch das Team.
  Freigegebener Spitzname ersetzt „Vorname + Initiale“.
- Unter 16 (und **alte minderjährige Einträge ohne Altersstufe**): nur wenn die Eltern zugestimmt haben
  (Mitglied + Name bzw. Foto). Alte Kinder-Einträge verschwinden deshalb von der Wall, bis die Eltern bestätigen –
  dafür im Team-Bereich „Eltern-Bestätigung anfordern“ nutzen. Es werden keine Daten geändert.
- Fotos von allen Minderjährigen (unter 16 und 16/17) nur mit Eltern-Zustimmung „Foto“ und Team-Freigabe.
- **Achtung:** Bestehende Einträge mit nur einem Wort als Name (z. B. „Luca“) sind ab dem Merge nicht mehr sichtbar,
  bis das Team sie mit „✓ Name freigeben“ freigibt.

## Migration 004 in Supabase ausführen

1. Backup: Supabase-Dashboard → *Database → Backups* (oder *Table Editor → squadra_tre → Export to CSV*).
2. *SQL Editor → New query* → Inhalt von `supabase/migrations/004_squadra_dsgvo.sql` einfügen → *Run*.
3. Prüfen: *Table Editor → squadra_tre* hat die neuen Spalten (`altersstufe`, `spitzname`, `name_freigegeben`,
   `eltern_token`, `eltern_bestaetigt_am`, `eltern_zwecke`, `einwilligung_version`, `token_ablauf`, `verwalten_token`,
   `einwilligung_nachweis`, `einwilligung_am`).

Die Migration fügt nur Spalten, Prüfregeln und Indizes hinzu, löscht nichts und ändert keine vorhandenen Werte.
Sie kann mehrfach ausgeführt werden. Bestehende Zeilen bekommen automatisch je einen eigenen `verwalten_token`
und `eltern_token`.

## Neue Umgebungsvariablen

Keine. Genutzt werden die vorhandenen (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
`BREVO_API_KEY`, `MAIL_FROM`, `NETLIFY_BUILD_HOOK_URL`, …). Das Rate-Limit nutzt Netlify Blobs (Store `squadra-limit`).

## Neue Seiten (alle Sprachen: `/`, `/it/`, `/en/`, `/fr/`)

| Seite | Zweck |
|---|---|
| `/squadra-bestaetigen/?t=…` | Fan bestätigt die Anmeldung per Knopf (POST) |
| `/squadra-eltern/?t=…` | Eltern sehen Name, Spitzname, Foto und entscheiden je Zweck; Pflicht-Häkchen Sorgerecht |
| `/squadra-verwalten/?t=…` | „Daten ändern oder löschen“ |

Die Seiten sind statisch, enthalten keine Daten, sind `noindex` und werden nicht zwischengespeichert.

## Neue / geänderte Functions

| Function | Was |
|---|---|
| `squadra-join` | Altersstufen, Eltern-Regeln, Spitzname, EXIF entfernen, Rate-Limit (3/E-Mail/Tag, 10/IP/Stunde), doppelte Adresse → keine neue Zeile, Mail erneut |
| `squadra-confirm` | GET leitet nur zur Bestätigungsseite; POST bestätigt (7 Tage gültig; unter 16 nicht möglich) |
| `squadra-eltern` (neu) | GET Übersicht / Foto (nur gültiger Eltern-Link), POST Zustimmung je Zweck |
| `squadra-verwalten` (neu) | Foto entfernen, von der Wall, keine E-Mails, austreten; Ein-Klick-Abmeldung (List-Unsubscribe) |
| `squadra-eltern-anfordern` (neu, Admin) | neuer Eltern-Link + Eltern-Mail |
| `squadra-druck` (neu, Admin) | Daten für die Druckansicht (signierte Bild-Links, 1 Stunde) |
| `squadra-cleanup` (neu, täglich 03:17 UTC) | löscht unbestätigte Anmeldungen nach 7 Tagen (unter 16: ohne Eltern), bei 16/17 ohne Eltern-Zustimmung nur das Foto |
| `squadra-message`, `report-send` | unter 16 nur mit Eltern-Zustimmung „Updates“ bzw. „Jahresbericht“; Verwalten-Link und `List-Unsubscribe`-Header |
| `squadra-wochenbericht` | keine Minderjährigen im Instagram-Post-Text |

Gemeinsame Regeln: `netlify/functions/_lib/squadra-rules.mjs` (auch vom Website-Build genutzt).
Metadaten entfernen: `stripMetadata()` in `netlify/functions/_lib/common.mjs`.
Texte: E-Mails in `netlify/functions/_lib/texte.mjs`, Seiten in `locales/*.json`, Datenschutzerklärung Abschnitt 5
in `content/einstellungen/site.json` (Deutsch maßgeblich).

## Testen

```bash
npm test         # Regeln, Metadaten-Entfernung, Wall-Filter, Eltern, Rundmails, Aufräumen (ohne Netzwerk)
npm run build    # baut die Website; ohne Supabase-Zugang mit Beispieldaten wie bisher
```

Nach dem Merge (live, mit einer eigenen Test-Adresse):
1. Anmeldung 18+ mit Foto → Mail → Knopf auf der Seite → Team gibt Foto frei → erscheint auf der Wall.
2. Anmeldung unter 16 mit eigener Zweit-Adresse als Eltern-Adresse → Eltern-Seite → Foto abwählen → Name erscheint, Foto ist gelöscht.
3. Anmeldung 16/17 mit Foto → selbst bestätigen → Foto erscheint erst nach Eltern-Zustimmung.
4. In einer Mail „Daten ändern oder löschen“ → „austreten“ → Eintrag ist weg.
5. Druckansicht abgemeldet öffnen → leitet zum Login; angemeldet als Admin → Daten erscheinen.
