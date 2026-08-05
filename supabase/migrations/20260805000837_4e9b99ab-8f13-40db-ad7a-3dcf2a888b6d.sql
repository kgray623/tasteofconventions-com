CREATE TABLE public.meal_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preorder_id uuid NOT NULL REFERENCES public.cuisine_preorders(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  cuisine text NOT NULL,
  qty_paid integer NOT NULL DEFAULT 0,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  marked_by_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meal_payments_preorder_cuisine_key UNIQUE (preorder_id, cuisine)
);

GRANT SELECT ON public.meal_payments TO authenticated;
GRANT ALL ON public.meal_payments TO service_role;
ALTER TABLE public.meal_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view meal payments"
ON public.meal_payments FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role));

CREATE TRIGGER audit_meal_payments
AFTER INSERT OR UPDATE OR DELETE ON public.meal_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

CREATE TABLE public.restaurant_portal_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  rotated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_portal_access_restaurant_key UNIQUE (restaurant_id)
);

GRANT ALL ON public.restaurant_portal_access TO service_role;
ALTER TABLE public.restaurant_portal_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER meal_payments_updated_at BEFORE UPDATE ON public.meal_payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER restaurant_portal_access_updated_at BEFORE UPDATE ON public.restaurant_portal_access
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();