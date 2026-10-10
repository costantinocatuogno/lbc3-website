# LBC3 – Website von Luigi Battista Catuogno (#3)

Offizielle Website des Kartfahrers Luigi Battista Catuogno, gehostet auf **Netlify**.

| Teil | Technik | Wofür |
| --- | --- | --- |
| Seiten | eigenes Build-Skript (`scripts/build.mjs`), **keine npm-Pakete nötig** | erzeugt alle Seiten in DE/EN/IT als fertiges HTML |
| Inhalte | **Decap CMS** unter `/admin/` (Dateien im Ordner `content/`) | News, Rennen, Fotos, Kapitel, Sponsoren, Texte |
| Login & geschützte Daten | **Supabase** (Server in der EU) | Sponsoren-Login, Ausgabenbericht, Squadra-3-Liste |
| Serverfunktionen | **Netlify Functions** (`netlify/functions/`) | Squadra-3-Anmeldung, Einladungen, Jahresbericht-Versand |
| E-Mails | **Brevo** (EU) | Bestätigungs-Mails, Jahresbericht an die Squadra 3 |
| Kontaktformular | **Netlify Forms** | Nachrichten landen per E-Mail bei euch |

Die Anleitung für den Alltag (Fotos hochladen, Ergebnisse eintragen …) steht in **[ANLEITUNG.md](ANLEITUNG.md)**.

---

## Seiten

`/` Home · `/news/` · `/ueber-luigi/` · `/kalender/` · `/galerie/` · `/squadra-3/` (Fanclub + Wall of Fame) · `/partner/` (inkl. Sponsoren-Wall of Fame) · `/kontakt/` · `/impressum/` · `/datenschutz/`
Englisch unter `/en/…`, Italienisch unter `/it/…`.
Geschützt: `/login/` · `/bericht/` (Sponsoren + Admins) · `/team/` (nur Admins) · `/admin/` (CMS).
Intern (nicht verlinkt, noindex): `/wall-of-fame/druck/` – Druckvorlage der Fotowand.

## Lokal ansehen

Voraussetzung: Node.js 20 oder neuer.

```bash
node scripts/build.mjs     # baut die Seiten nach dist/
node scripts/serve.mjs     # Vorschau unter http://localhost:8888
```

Beim ersten Build lädt das Skript die Schriften (Barlow Condensed, Manrope) und die Supabase-Bibliothek einmalig herunter und legt sie selbst ab. Besucher laden dadurch nichts von fremden Servern.

---

## Einrichtung (einmalig, ca. 1–2 Stunden)

### 1. GitHub
1. Kostenloses Konto auf github.com anlegen.
2. Neues **privates** Repository `lbc3-website` erstellen und diesen Ordner hochladen („uploading an existing file“ oder per `git push`).

### 2. Supabase (Login & Datenbank)
1. Auf supabase.com ein Projekt anlegen, **Region: Frankfurt (eu-central-1)**.
2. **SQL Editor → New query**: Inhalt von `supabase/migrations/001_init.sql` einfügen → **Run**. Danach genauso `002_squadra3_wall.sql` (Squadra-3-Fotos, Sponsoren-Wall, private Speicher `squadra` und `sponsoren`).
3. **Authentication → Sign In / Providers → Email**: aktiv lassen. **„Allow new users to sign up“ ausschalten** (nur Einladungen).
4. **Authentication → URL Configuration**:
   - Site URL: `https://EURE-DOMAIN`
   - Redirect URLs: `https://EURE-DOMAIN/login/` (und zum Testen die Netlify-Adresse `https://….netlify.app/login/`)
5. **Authentication → SMTP Settings**: eigenen Versand über Brevo eintragen (Host `smtp-relay.brevo.com`, Port 587, Zugangsdaten aus Brevo → SMTP & API). Ohne eigenes SMTP verschickt Supabase nur sehr wenige E-Mails pro Stunde.
6. Optional: **Authentication → Email Templates** ins Deutsche übersetzen (Einladung, Passwort zurücksetzen, Magic Link).
7. **Project Settings → API Keys**: `Project URL` und zwei Schlüssel notieren. Gibt es den Reiter **Legacy API Keys**, dort `anon` und `service_role` nehmen. Sonst den **Publishable key** (statt anon) und einen **Secret key** (statt service_role) – beides funktioniert.
8. **Ersten Admin anlegen**: Authentication → Users → *Invite user* (eigene E-Mail). Dann im SQL Editor (E-Mail anpassen):
   ```sql
   insert into public.profiles (id, email, name, rolle)
     select id, email, 'Familie Catuogno', 'admin' from auth.users where email = 'DEINE@EMAIL.DE'
     on conflict (id) do update set rolle = 'admin';
   ```
   Die Einladungs-E-Mail öffnen → Passwort festlegen. Weitere Admins/Sponsoren danach bequem unter `/team/` einladen.

### 3. Brevo (E-Mails)
1. Konto auf brevo.com (Free-Tarif: 300 E-Mails/Tag).
2. **Senders, Domains & Dedicated IPs**: eure Domain verifizieren (DNS-Einträge) und Absender `kontakt@EURE-DOMAIN` anlegen.
3. **SMTP & API → API Keys**: neuen API-Key erstellen.

### 4. Netlify
1. Auf netlify.com: **Add new site → Import an existing project → GitHub →** `lbc3-website`. Build-Einstellungen kommen automatisch aus `netlify.toml`.
2. **Site configuration → Environment variables** anlegen:

   | Variable | Wert |
   | --- | --- |
   | `SUPABASE_URL` | Project URL aus Supabase |
   | `SUPABASE_ANON_KEY` | anon key bzw. Publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key bzw. Secret key (**geheim**, nur hier eintragen!) |
   | `BREVO_API_KEY` | API-Key aus Brevo |
   | `MAIL_FROM` | `kontakt@EURE-DOMAIN` (in Brevo verifiziert) |
   | `MAIL_FROM_NAME` | `LBC3 · Luigi Battista Catuogno` |
   | `MAIL_REPLY_TO` | Adresse, an die Antworten gehen sollen |
   | `SQUADRA_ZAHLUNGSINFO` | Text für die Bestätigungs-Mail, z. B. Kontoinhaber, IBAN, Verwendungszweck „Squadra 3“ oder ein PayPal-Link |
   | `NETLIFY_BUILD_HOOK_URL` | siehe Schritt 3 – nötig für den Knopf „Wall of Fame veröffentlichen“ |
3. **Site configuration → Build & deploy → Build hooks → Add build hook** („Wall of Fame“) und die URL als `NETLIFY_BUILD_HOOK_URL` eintragen. Damit funktioniert im Team-Bereich der Knopf **„Wall of Fame veröffentlichen“**, und bestätigte Namen erscheinen automatisch.
4. **Forms → Enable form detection**, dann **Forms → Form notifications → Email notification** für das Formular `kontakt` einrichten.
5. **Deploys → Trigger deploy**.
6. **Domain management**: eure Domain verbinden (HTTPS wird automatisch eingerichtet).

### 5. CMS-Zugang (Decap)
1. In `public/admin/config.yml` bei `repo:` euren GitHub-Namen eintragen (z. B. `catuogno/lbc3-website`), ebenso `site_url` und `display_url`.
2. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**:
   - Homepage URL: `https://EURE-DOMAIN`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
3. Netlify → **Site configuration → Access & security → OAuth → Install provider → GitHub** → Client ID und Secret aus Schritt 2 eintragen.
4. Jede Person, die Inhalte pflegt, braucht ein GitHub-Konto mit Schreibrecht auf das Repository (GitHub → Repository → Settings → Collaborators).
5. Anmelden unter `https://EURE-DOMAIN/admin/` → „Login with GitHub“.

> Alternative ohne GitHub-Konten für die Familie: DecapBridge (decapbridge.com) – Login per E-Mail; dann `backend` in `config.yml` laut deren Anleitung ändern.

---

## Sicherheit & Datenschutz
- Der Ausgabenbericht und die Squadra-3-Liste liegen **nur in Supabase**, nie im Code oder in den Seiten. Der Zugriff wird in der Datenbank per Row-Level-Security geprüft: Sponsoren lesen nur freigegebene Berichte, nur Admins schreiben.
- Der `service_role`-Key wird ausschließlich in Netlify Functions verwendet.
- Squadra 3: Double-Opt-in, alle Einwilligungs-Häkchen sind standardmäßig **aus**. Unter 16: Die Bestätigung läuft über die E-Mail eines Elternteils. Namen erscheinen als Vorname + Initiale.
- Fotos und Sponsoren-Logos liegen in **privaten** Supabase-Speichern. Öffentlich wird nur, was im Team-Bereich freigegeben ist: Der Build kopiert genau diese Bilder nach `/wall/` auf eure eigene Domain. Sponsoren können nur ihren eigenen Eintrag ändern; jede Änderung setzt die Freigabe zurück (Datenbank-Trigger).
- Social-Media-Links werden nur als `http(s)://`-Links ausgegeben.
- Keine Tracking-Cookies, Schriften selbst gehostet, strenge Content-Security-Policy (`netlify.toml`).
- Luigi ist minderjährig: Die Privatadresse gehört nur ins Impressum. Fotos mit erkennbaren anderen Personen nur mit deren Einwilligung veröffentlichen.
- Datenschutzerklärung (CMS → Einstellungen) muss Netlify, Supabase, Brevo und Netlify Forms nennen und die Squadra-3-Fotos (Zweck: Wall of Fame online und gedruckt, Einwilligung, Widerruf, Eltern-Einwilligung unter 16) beschreiben; Auftragsverarbeitungsverträge (DPA) bei allen drei Anbietern abschließen.

## Kosten (Stand der Einrichtung, bitte bei den Anbietern prüfen)
Netlify Free, Supabase Free, Brevo Free reichen für den Start. Kostenlose Supabase-Projekte werden bei längerer Inaktivität pausiert. Die tägliche Funktion `keepalive` hält das Projekt aktiv; falls es trotzdem pausiert, im Supabase-Dashboard „Restore“ klicken oder auf den Pro-Tarif wechseln.

## Noch offene Platzhalter
In eckigen Klammern im Inhalt, z. B. `[STRECKE]`, `[DATUM]`, `[KLASSE]`, `[TEAM]`, `[PREIS / SAISON]`, `[SPONSOR 1]`, `kontakt@[DOMAIN]`, Impressum und Datenschutzerklärung.
Beispieldaten zum Prüfen: Datum des Ampfing-Rennens (01.07.2026 ist ein Platzhalter), das Beispielrennen am 14.03.2027 (Countdown), Daten der News-Beiträge, Fotograf (Kadicfilms Studios laut Bilddaten – bitte bestätigen).

## Projektstruktur
```
content/              Inhalte (vom CMS gepflegt)
public/               Bilder, CSS, JavaScript, Intro-Video, CMS (/admin)
scripts/build.mjs     Build: erzeugt dist/
scripts/templates/    Seitenvorlagen
scripts/lib/          Inhalte laden, Übersetzungen, Markdown, Helfer
netlify/functions/    Serverfunktionen (/api/…)
supabase/migrations/  Datenbank-Schema + Zugriffsregeln
```
