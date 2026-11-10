-- © 2026 LBC3
-- Gegen-Skript zu 005_kontakt_anfragen.sql: entfernt die Kartei wieder.
-- ACHTUNG: löscht alle gespeicherten Anfragen. Vorher bei Bedarf sichern (Table Editor → kontakt_anfragen → Export CSV).
-- Die E-Mails an contact@luigi-catuogno.com sind davon nicht betroffen.
drop table if exists public.kontakt_anfragen;
