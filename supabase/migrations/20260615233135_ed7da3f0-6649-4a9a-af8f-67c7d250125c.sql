CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  phone_normalized text NULL,
  display_name text NULL,
  action text NOT NULL,
  target_type text NULL,
  target_id text NULL,
  ip text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_phone_idx ON public.audit_log (phone_normalized);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));