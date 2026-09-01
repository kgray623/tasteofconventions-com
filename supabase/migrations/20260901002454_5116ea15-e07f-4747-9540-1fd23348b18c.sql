ALTER TABLE public.shared_photos
  ADD COLUMN IF NOT EXISTS external_url text;

ALTER TABLE public.shared_photos
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.shared_photos
  ADD CONSTRAINT shared_photos_source_present
  CHECK (
    (storage_path IS NOT NULL AND length(btrim(storage_path)) > 0)
    OR (external_url IS NOT NULL AND length(btrim(external_url)) > 0)
  );