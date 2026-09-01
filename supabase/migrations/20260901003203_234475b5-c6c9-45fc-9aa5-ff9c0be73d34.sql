ALTER TABLE public.shared_photos
  DROP CONSTRAINT IF EXISTS shared_photos_media_type_check;

ALTER TABLE public.shared_photos
  ADD CONSTRAINT shared_photos_media_type_check
  CHECK (media_type IN ('image', 'video', 'link'));