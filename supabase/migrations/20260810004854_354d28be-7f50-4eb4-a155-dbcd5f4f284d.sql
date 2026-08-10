ALTER TABLE public.meal_payments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS reported_by uuid,
  ADD COLUMN IF NOT EXISTS reported_by_label text,
  ADD COLUMN IF NOT EXISTS reported_note text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

UPDATE public.meal_payments SET source = 'restaurant' WHERE source IS NULL;

CREATE OR REPLACE FUNCTION public.meal_payments_source_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source NOT IN ('restaurant','guest_reported','committee_recorded') THEN
    RAISE EXCEPTION 'invalid meal payment source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meal_payments_source_guard ON public.meal_payments;
CREATE TRIGGER meal_payments_source_guard
  BEFORE INSERT OR UPDATE ON public.meal_payments
  FOR EACH ROW EXECUTE FUNCTION public.meal_payments_source_guard();