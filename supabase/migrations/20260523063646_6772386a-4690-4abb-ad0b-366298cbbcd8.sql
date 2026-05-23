ALTER TABLE public.inviters ADD COLUMN IF NOT EXISTS host_id uuid;
CREATE INDEX IF NOT EXISTS inviters_host_id_idx ON public.inviters(host_id);
INSERT INTO public.inviters (name, quota, active, host_id)
VALUES ('Gary Gray', 40, true, 'c3160a24-000a-46b0-811b-ffe22e265981')
ON CONFLICT DO NOTHING;