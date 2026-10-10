-- LBC3 – Datenbank für Login, Ausgabenbericht und Squadra 3
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → Inhalt einfügen → Run.

-- ---------- Rollen & Profile ----------
do $$ begin
  create type public.rolle as enum ('admin', 'sponsor');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text,
  firma      text,
  rolle      public.rolle not null default 'sponsor',
  created_at timestamptz not null default now()
);

-- Rolle des angemeldeten Benutzers (security definer, damit die Policies nicht rekursiv werden)
create or replace function public.meine_rolle()
returns public.rolle language sql stable security definer set search_path = public as $$
  select rolle from public.profiles where id = auth.uid()
$$;
revoke all on function public.meine_rolle() from public;
grant execute on function public.meine_rolle() to authenticated;

alter table public.profiles enable row level security;
drop policy if exists "profil lesen" on public.profiles;
create policy "profil lesen" on public.profiles for select to authenticated
  using (id = auth.uid() or public.meine_rolle() = 'admin');
drop policy if exists "profile verwalten (admin)" on public.profiles;
create policy "profile verwalten (admin)" on public.profiles for all to authenticated
  using (public.meine_rolle() = 'admin') with check (public.meine_rolle() = 'admin');

-- ---------- Ausgabenbericht ----------
create table if not exists public.bericht_saison (
  saison            int primary key,
  rennwochenenden   int,
  kilometer         int,
  fin_sponsoren     numeric(12,2) default 0,
  fin_squadra       numeric(12,2) default 0,
  fin_eigen         numeric(12,2) default 0,
  fin_sonstiges     numeric(12,2) default 0,
  rueckblick        text,
  pdf_bericht       text,
  pdf_belege        text,
  status            text not null default 'entwurf' check (status in ('entwurf', 'freigegeben')),
  freigegeben_am    timestamptz,
  mail_versendet_am timestamptz,
  updated_at        timestamptz not null default now()
);

create table if not exists public.ausgaben (
  id        bigserial primary key,
  saison    int not null references public.bericht_saison (saison) on delete cascade,
  kategorie text not null,
  betrag    numeric(12,2) not null default 0,
  unique (saison, kategorie)
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists bericht_touch on public.bericht_saison;
create trigger bericht_touch before update on public.bericht_saison for each row execute function public.touch_updated_at();

alter table public.bericht_saison enable row level security;
alter table public.ausgaben enable row level security;

drop policy if exists "bericht lesen" on public.bericht_saison;
create policy "bericht lesen" on public.bericht_saison for select to authenticated
  using (public.meine_rolle() = 'admin' or (public.meine_rolle() = 'sponsor' and status = 'freigegeben'));
drop policy if exists "bericht schreiben (admin)" on public.bericht_saison;
create policy "bericht schreiben (admin)" on public.bericht_saison for all to authenticated
  using (public.meine_rolle() = 'admin') with check (public.meine_rolle() = 'admin');

drop policy if exists "ausgaben lesen" on public.ausgaben;
create policy "ausgaben lesen" on public.ausgaben for select to authenticated
  using (
    public.meine_rolle() = 'admin'
    or (public.meine_rolle() = 'sponsor' and exists (
      select 1 from public.bericht_saison b where b.saison = ausgaben.saison and b.status = 'freigegeben'))
  );
drop policy if exists "ausgaben schreiben (admin)" on public.ausgaben;
create policy "ausgaben schreiben (admin)" on public.ausgaben for all to authenticated
  using (public.meine_rolle() = 'admin') with check (public.meine_rolle() = 'admin');

-- ---------- Squadra 3 (Unterstützer, ohne Login) ----------
create table if not exists public.squadra_tre (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  email               text not null,
  art                 text,
  betrag              numeric(12,2),
  sprache             text default 'de',
  jahresbericht_optin boolean not null default true,
  wand_optin          boolean not null default false,
  optin_bestaetigt    boolean not null default false,
  token               uuid not null default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  bestaetigt_am       timestamptz
);
create index if not exists squadra_tre_token_idx on public.squadra_tre (token);

-- Nur Admins dürfen die Liste sehen/ändern. Anmeldungen laufen über die Netlify Function (Service-Key).
alter table public.squadra_tre enable row level security;
drop policy if exists "squadra (admin)" on public.squadra_tre;
create policy "squadra (admin)" on public.squadra_tre for all to authenticated
  using (public.meine_rolle() = 'admin') with check (public.meine_rolle() = 'admin');

-- ---------- Dateien: privater Speicher für PDFs ----------
insert into storage.buckets (id, name, public) values ('berichte', 'berichte', false)
on conflict (id) do nothing;

drop policy if exists "berichte lesen" on storage.objects;
create policy "berichte lesen" on storage.objects for select to authenticated
  using (
    bucket_id = 'berichte' and (
      public.meine_rolle() = 'admin'
      or (public.meine_rolle() = 'sponsor' and exists (
        select 1 from public.bericht_saison b
        where b.status = 'freigegeben' and b.saison::text = (storage.foldername(name))[1]))
    )
  );
drop policy if exists "berichte schreiben (admin)" on storage.objects;
create policy "berichte schreiben (admin)" on storage.objects for insert to authenticated
  with check (bucket_id = 'berichte' and public.meine_rolle() = 'admin');
drop policy if exists "berichte ändern (admin)" on storage.objects;
create policy "berichte ändern (admin)" on storage.objects for update to authenticated
  using (bucket_id = 'berichte' and public.meine_rolle() = 'admin');
drop policy if exists "berichte löschen (admin)" on storage.objects;
create policy "berichte löschen (admin)" on storage.objects for delete to authenticated
  using (bucket_id = 'berichte' and public.meine_rolle() = 'admin');

-- ---------- Ersten Admin anlegen ----------
-- 1. Im Supabase-Dashboard unter Authentication → Users → "Invite user" die eigene E-Mail einladen.
-- 2. Danach diese Zeile mit der eigenen E-Mail ausführen:
-- insert into public.profiles (id, email, name, rolle)
--   select id, email, 'Familie Catuogno', 'admin' from auth.users where email = 'DEINE@EMAIL.DE'
--   on conflict (id) do update set rolle = 'admin';
