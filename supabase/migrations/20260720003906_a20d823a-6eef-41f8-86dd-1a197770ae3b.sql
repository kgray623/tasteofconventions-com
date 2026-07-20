
CREATE TABLE public.traffic_daily_rollup (
  date DATE PRIMARY KEY,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'lovable_insights',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.traffic_daily_rollup TO authenticated;
GRANT ALL ON public.traffic_daily_rollup TO service_role;

ALTER TABLE public.traffic_daily_rollup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view traffic rollup"
  ON public.traffic_daily_rollup FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
