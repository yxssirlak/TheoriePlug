-- Verwijdert definitief de oude ADAS-inhoud. Opgeslagen bestanden worden
-- afzonderlijk via de Storage API verwijderd; zie de README.
drop table if exists public.adas_items;
