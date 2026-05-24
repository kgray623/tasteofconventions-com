
-- Reset grants so authenticated admins/team can use RLS normally
DROP POLICY IF EXISTS "inviters public reads active rows" ON public.inviters;
REVOKE ALL ON public.inviters FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inviters TO authenticated;

-- Public selector goes through a SECURITY DEFINER RPC that returns only id + name
CREATE OR REPLACE FUNCTION public.get_public_inviters()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.inviters
  WHERE active = true
  ORDER BY name
$$;

REVOKE ALL ON FUNCTION public.get_public_inviters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_inviters() TO anon, authenticated;
