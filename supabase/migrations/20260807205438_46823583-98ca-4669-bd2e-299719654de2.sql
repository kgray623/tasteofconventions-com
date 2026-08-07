ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS venmo_handle text,
  ADD COLUMN IF NOT EXISTS zelle_name text,
  ADD COLUMN IF NOT EXISTS zelle_phone text,
  ADD COLUMN IF NOT EXISTS zelle_qr_url text;