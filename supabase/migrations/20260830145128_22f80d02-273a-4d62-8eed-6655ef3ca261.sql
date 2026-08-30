ALTER TABLE public.invitation_content
  ADD COLUMN IF NOT EXISTS map_lat double precision NOT NULL DEFAULT 41.0656704,
  ADD COLUMN IF NOT EXISTS map_lng double precision NOT NULL DEFAULT -95.9158954;

UPDATE public.invitation_content
   SET map_lat = 41.0656704,
       map_lng = -95.9158954,
       updated_at = now();