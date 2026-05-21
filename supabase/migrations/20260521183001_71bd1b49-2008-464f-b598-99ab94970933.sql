CREATE TABLE public.inviters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  quota INTEGER NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inviters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inviters readable by all"
  ON public.inviters FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin or team manage inviters"
  ON public.inviters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'team'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'team'::app_role));

CREATE INDEX idx_rsvps_invited_by ON public.rsvps (invited_by) WHERE invited_by IS NOT NULL;