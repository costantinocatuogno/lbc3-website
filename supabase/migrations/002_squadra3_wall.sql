-- LBC3 – Squadra 3 (kostenlose Mitgliedschaft, Fotos) und Wall of Fame für Sponsoren
-- Nach 001_init.sql ausführen: SQL Editor → New query → Inhalt einfügen → Run.

-- ---------- Squadra 3: neue Felder ----------
alter table public.squadra_tre
  add column if not exists mitgliedschaft      text not null default 'freund' check (mitgliedschaft in ('freund', 'unterstuetzer')),
  add column if not exists instagram           text,
  add column if not exists foto_pfad           text,          -- squadra/<id>.jpg (privater Bucket)
  add column if not exists foto_freigegeben    boolean not null default false,
  add column if not exists ausgeblendet        boolean not null default false,  -- Admin kann Einträge von der Wall nehmen
  add column if not exists angezeigter_name    text,          -- öffentlicher Name auf der Wall (Standard: Vorname + Initiale)
  add column if not exists minderjaehrig       boolean not null default false,
  add column if not exists einwilligung_eltern text,          -- E-Mail des Elternteils, das zugestimmt hat
  add column if not exists updates_optin       boolean not null default false,
  add column if not exists quelle              text not null default 'website' check (quelle in ('website', 'admin'));

-- Freunde, die das Team selbst einträgt (z. B. am Rennzelt), brauchen keine E-Mail-Adresse
alter table public.squadra_tre alter column email drop not null;

-- Bisherige Einträge mit Betrag gelten als Unterstützer
update public.squadra_tre set mitgliedschaft = 'unterstuetzer' where coalesce(betrag, 0) > 0 and mitgliedschaft = 'freund';

-- ---------- Wall of Fame: Sponsoren ----------
create table if not exists public.sponsor_wall (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete cascade,
  firma           text not null,
  ansprechpartner text,
  email           text,
  website         text not null check (website ~* '^https?://'),
  instagram       text,
  facebook        text,
  linkedin        text,
  tiktok          text,
  youtube         text,
  logo_pfad       text,          -- sponsoren/<user_id>/logo.*
  text            text check (char_length(text) <= 280),
  paket           text,
  freigegeben     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint sponsor_wall_social check (
    coalesce(instagram, facebook, linkedin, tiktok, youtube) is not null
  )
);

-- Ändert ein Sponsor seinen Eintrag, muss er neu freigegeben werden
create or replace function public.sponsor_wall_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if coalesce(public.meine_rolle()::text, '') <> 'admin' and auth.role() = 'authenticated' then
    new.freigegeben = false;
    new.user_id = auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists sponsor_wall_guard on public.sponsor_wall;
create trigger sponsor_wall_guard before insert or update on public.sponsor_wall
  for each row execute function public.sponsor_wall_guard();

alter table public.sponsor_wall enable row level security;
drop policy if exists "wall eigener eintrag" on public.sponsor_wall;
create policy "wall eigener eintrag" on public.sponsor_wall for all to authenticated
  using (user_id = auth.uid() or public.meine_rolle() = 'admin')
  with check (user_id = auth.uid() or public.meine_rolle() = 'admin');

-- ---------- Private Speicher für Fotos und Logos ----------
-- Öffentlich werden nur freigegebene Bilder: der Build lädt sie herunter und legt sie unter /wall/ ab.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('squadra', 'squadra', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsoren', 'sponsoren', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "squadra fotos (admin)" on storage.objects;
create policy "squadra fotos (admin)" on storage.objects for all to authenticated
  using (bucket_id = 'squadra' and public.meine_rolle() = 'admin')
  with check (bucket_id = 'squadra' and public.meine_rolle() = 'admin');

drop policy if exists "sponsor logos lesen" on storage.objects;
create policy "sponsor logos lesen" on storage.objects for select to authenticated
  using (bucket_id = 'sponsoren' and (public.meine_rolle() = 'admin' or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "sponsor logos hochladen" on storage.objects;
create policy "sponsor logos hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'sponsoren' and (public.meine_rolle() = 'admin' or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "sponsor logos ändern" on storage.objects;
create policy "sponsor logos ändern" on storage.objects for update to authenticated
  using (bucket_id = 'sponsoren' and (public.meine_rolle() = 'admin' or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "sponsor logos löschen" on storage.objects;
create policy "sponsor logos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'sponsoren' and (public.meine_rolle() = 'admin' or (storage.foldername(name))[1] = auth.uid()::text));
