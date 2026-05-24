
DROP VIEW IF EXISTS public.inviters_public;

-- Column-level grants: anon/authenticated can only read non-PII columns
REVOKE ALL ON public.inviters FROM anon, authenticated;
GRANT SELECT (id, name, active) ON public.inviters TO anon, authenticated;
-- Admin/team operations use authenticated role via RLS; re-grant full DML for them
GRANT INSERT, UPDATE, DELETE ON public.inviters TO authenticated;
GRANT SELECT ON public.inviters TO authenticator, service_role;

-- Row policy: only active rows are visible to the public selector
CREATE POLICY "inviters public reads active rows"
ON public.inviters
FOR SELECT
TO anon, authenticated
USING (active = true);
