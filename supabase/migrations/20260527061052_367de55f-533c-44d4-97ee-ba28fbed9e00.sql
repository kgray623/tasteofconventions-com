ALTER TABLE public.inviters ADD COLUMN IF NOT EXISTS requested_quota integer;
ALTER TABLE public.inviters ADD COLUMN IF NOT EXISTS quota_request_note text;
ALTER TABLE public.inviters ADD COLUMN IF NOT EXISTS quota_requested_at timestamptz;