-- Staat grote videobestanden toe in de course-media bucket (max 5 GB per bestand).
-- Let op: de globale limiet van het project (Storage → Settings) blijft leidend.
update storage.buckets
set file_size_limit = 5368709120
where id = 'course-media';
