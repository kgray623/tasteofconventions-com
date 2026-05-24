
-- 1) Restrict public read on inviters; expose only id/name via a view
DROP POLICY IF EXISTS "inviters readable by all" ON public.inviters;

CREATE OR REPLACE VIEW public.inviters_public
WITH (security_invoker = false) AS
SELECT id, name, active
FROM public.inviters
WHERE active = true;

GRANT SELECT ON public.inviters_public TO anon, authenticated;

-- 2) Realtime channel authorization for team_messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team can read team_messages realtime" ON realtime.messages;
CREATE POLICY "team can read team_messages realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'team_messages'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'team'::app_role))
);
