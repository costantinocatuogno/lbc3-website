-- LBC3 – Mehrsprachigkeit (Deutsch, Italienisch, Englisch, Französisch)
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → Inhalt einfügen → Run.
-- Nur Ergänzungen, nichts wird gelöscht. Die Website funktioniert auch, solange das noch nicht ausgeführt ist.

-- Sprache eines Partners oder Admins: in dieser Sprache gehen Einladung und E-Mails raus
alter table public.profiles add column if not exists sprache text not null default 'de';
do $$ begin
  alter table public.profiles add constraint profiles_sprache_check check (sprache in ('de', 'it', 'en', 'fr'));
exception when duplicate_object then null; end $$;

-- Squadra Tre: die Spalte „sprache“ gibt es schon (de/en/it) – „fr“ kommt jetzt einfach dazu, keine Änderung nötig.

-- Saisonrückblick im Ausgabenbericht in weiteren Sprachen (vom Team geprüft)
alter table public.bericht_saison add column if not exists rueckblick_it text;
alter table public.bericht_saison add column if not exists rueckblick_en text;
alter table public.bericht_saison add column if not exists rueckblick_fr text;
