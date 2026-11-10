-- © 2026 LBC3
-- LBC3 – Kartei für Anfragen aus dem Kontaktformular (Team-Bereich → Anfragen), Stand 10.11.2026
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → Inhalt einfügen → Run. Mehrfach ausführbar.
-- Nur Ergänzung: eine neue Tabelle, nichts Bestehendes wird verändert.
-- Rückgängig machen: 005_kontakt_anfragen_rueckgaengig.sql (löscht nur diese Tabelle samt Inhalt).

create table if not exists public.kontakt_anfragen (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) <= 80),
  email        text not null check (char_length(email) <= 200),
  firma        text check (firma is null or char_length(firma) <= 120),
  anliegen     text not null default 'sonstiges' check (anliegen in ('sponsoring', 'mappe', 'presse', 'sonstiges')),
  sprache      text not null default 'de' check (sprache in ('de', 'it', 'en', 'fr')),
  nachricht    text not null check (char_length(nachricht) <= 5000),
  status       text not null check (status in ('ok', 'spam')),          -- Label in der Kartei: grün OK / rot Spam
  status_von   text not null default 'auto' check (status_von in ('auto', 'admin')), -- automatisch oder von Hand geändert
  status_am    timestamptz not null default now(),                       -- wann das Label zuletzt gesetzt wurde (Spam-Frist zählt ab hier)
  spam_wert    integer not null default 0,                               -- Punkte der Spam-Prüfung (ab 5 = Spam)
  spam_gruende text[] not null default '{}',                             -- Gründe, gut lesbar
  quelle       text not null default 'formular' check (quelle in ('formular', 'email')), -- email = von Hand übernommen
  erledigt_am  timestamptz
);

create index if not exists kontakt_anfragen_created_at_idx on public.kontakt_anfragen (created_at desc);
create index if not exists kontakt_anfragen_email_idx on public.kontakt_anfragen (email, created_at);
create index if not exists kontakt_anfragen_status_idx on public.kontakt_anfragen (status, erledigt_am, created_at desc);

-- Nur Admins (gleiches Muster wie Squadra Tre). Das Formular schreibt über die Server-Funktion.
alter table public.kontakt_anfragen enable row level security;
drop policy if exists "anfragen (admin)" on public.kontakt_anfragen;
create policy "anfragen (admin)" on public.kontakt_anfragen for all to authenticated
  using (public.meine_rolle() = 'admin') with check (public.meine_rolle() = 'admin');
revoke all on public.kontakt_anfragen from anon;
