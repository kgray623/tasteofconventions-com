DROP POLICY IF EXISTS "No direct client access to restaurant portal credentials" ON public.restaurant_portal_access;
CREATE POLICY "No direct client access to restaurant portal credentials"
ON public.restaurant_portal_access
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);