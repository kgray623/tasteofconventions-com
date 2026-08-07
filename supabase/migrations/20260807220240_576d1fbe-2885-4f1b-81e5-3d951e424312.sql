ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS chicken_price numeric,
  ADD COLUMN IF NOT EXISTS beef_price numeric,
  ADD COLUMN IF NOT EXISTS price_note text;

UPDATE public.restaurants SET chicken_price = 24, beef_price = 29, price_note = 'includes tax and delivery fees' WHERE lower(coalesce(cuisine, name)) LIKE '%indonesia%';
UPDATE public.restaurants SET chicken_price = 21.90, beef_price = 27.38, price_note = 'includes tax' WHERE lower(coalesce(cuisine, name)) LIKE '%africa%';

CREATE TABLE IF NOT EXISTS public.meal_zelle_text_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id uuid NOT NULL REFERENCES public.cuisine_preorders(id) ON DELETE CASCADE,
  cuisine text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  marked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preorder_id, cuisine)
);

GRANT SELECT ON public.meal_zelle_text_sends TO authenticated;
GRANT ALL ON public.meal_zelle_text_sends TO service_role;

ALTER TABLE public.meal_zelle_text_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view zelle update marks"
ON public.meal_zelle_text_sends FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'team'));

CREATE TRIGGER set_meal_zelle_text_sends_updated_at
BEFORE UPDATE ON public.meal_zelle_text_sends
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER audit_meal_zelle_text_sends
AFTER INSERT OR UPDATE OR DELETE ON public.meal_zelle_text_sends
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();