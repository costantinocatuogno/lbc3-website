-- LBC3 – Squadra Tre: Datenschutz-Umbau (Anforderungen L1–L17 der Rechtsabteilung, Stand 02.11.2026)
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → Inhalt einfügen → Run. VORHER ein Backup machen
-- (Database → Backups, oder Table Editor → squadra_tre → Export CSV).
-- Nur Ergänzungen: keine Zeile wird gelöscht, kein vorhandener Wert wird geändert. Mehrfach ausführbar.
-- Neue Spalten mit Zufalls-Standardwert (Tokens) bekommen für bestehende Zeilen automatisch je einen eigenen Wert.

alter table public.squadra_tre
  add column if not exists altersstufe           text,                                   -- unter16 | 16bis17 | 18plus (alt: leer)
  add column if not exists spitzname             text,                                   -- optional, max. 20 Zeichen, braucht Freigabe
  add column if not exists name_freigegeben      boolean not null default false,         -- Team hat Einwortnamen/Spitznamen freigegeben
  add column if not exists eltern_token          uuid default gen_random_uuid(),         -- nur für die Eltern-Seite (7 Tage gültig)
  add column if not exists eltern_bestaetigt_am  timestamptz,                            -- wann die Eltern zugestimmt haben
  add column if not exists eltern_zwecke         jsonb,                                  -- {mitglied, wall_name, foto, updates, jahresbericht}
  add column if not exists einwilligung_version  text,                                   -- Stand der Einwilligungstexte, z. B. 2026-11-02
  add column if not exists token_ablauf          timestamptz,                            -- Bestätigungslinks gültig bis (leer = created_at + 7 Tage)
  add column if not exists verwalten_token       uuid not null default gen_random_uuid(),-- langlebig: „Daten ändern oder löschen“
  add column if not exists einwilligung_nachweis text,                                   -- Admin-Einträge: wie/wann eingewilligt wurde
  add column if not exists einwilligung_am       timestamptz;                            -- Zeitpunkt der Einwilligung (Formular bzw. Admin)

do $$ begin
  alter table public.squadra_tre add constraint squadra_tre_altersstufe_check
    check (altersstufe is null or altersstufe in ('unter16', '16bis17', '18plus'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.squadra_tre add constraint squadra_tre_spitzname_check
    check (spitzname is null or char_length(spitzname) <= 20);
exception when duplicate_object then null; end $$;

create index if not exists squadra_tre_eltern_token_idx    on public.squadra_tre (eltern_token);
create unique index if not exists squadra_tre_verwalten_token_idx on public.squadra_tre (verwalten_token);
create index if not exists squadra_tre_email_lower_idx     on public.squadra_tre (lower(email));
create index if not exists squadra_tre_created_at_idx      on public.squadra_tre (created_at);

-- Zugriff unverändert: nur Admins (Policy "squadra (admin)" aus 001); Anmeldungen laufen über die Netlify Functions.
