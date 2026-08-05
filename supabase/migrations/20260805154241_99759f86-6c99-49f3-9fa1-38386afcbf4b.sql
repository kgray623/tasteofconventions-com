CREATE TABLE public.meal_order_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preorder_id uuid NOT NULL REFERENCES public.cuisine_preorders(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  cuisine text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by_label text,
  qty_confirmed integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meal_order_status_unique UNIQUE (preorder_id, cuisine)
);

GRANT ALL ON public.meal_order_status TO service_role;

ALTER TABLE public.meal_order_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_order_status_admin_read"
ON public.meal_order_status
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'team'));

CREATE TRIGGER set_meal_order_status_updated_at
BEFORE UPDATE ON public.meal_order_status
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER audit_meal_order_status
AFTER INSERT OR UPDATE OR DELETE ON public.meal_order_status
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();