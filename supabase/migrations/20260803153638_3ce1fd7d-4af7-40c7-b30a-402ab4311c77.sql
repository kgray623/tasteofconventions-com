ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS order_ready boolean NOT NULL DEFAULT true;

ALTER TABLE public.cuisine_preorders
  ADD COLUMN IF NOT EXISTS meal_text_sent_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_team" ON public.app_settings;
CREATE POLICY "app_settings_select_team" ON public.app_settings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'team'));

DROP POLICY IF EXISTS "app_settings_write_team" ON public.app_settings;
CREATE POLICY "app_settings_write_team" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'team'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'team'));

INSERT INTO public.app_settings (key, value)
VALUES ('meal_text_template',
'Hi {first_name} — based on your RSVP for A Taste of Special Conventions, please contact the restaurant below to pre-order and pay for your catered meal.

{restaurant_name} — {restaurant_phone}
Your order: {order}

The restaurant has been notified that you will be calling, so please do so promptly. Thank you!')
ON CONFLICT (key) DO NOTHING;