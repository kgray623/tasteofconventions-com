CREATE TABLE public.donations_summary (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT donations_summary_singleton CHECK (id = true)
);

ALTER TABLE public.donations_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donations readable by admin or team"
ON public.donations_summary FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));

CREATE POLICY "admins manage donations"
ON public.donations_summary FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.donations_summary (id, total_amount) VALUES (true, 0) ON CONFLICT DO NOTHING;