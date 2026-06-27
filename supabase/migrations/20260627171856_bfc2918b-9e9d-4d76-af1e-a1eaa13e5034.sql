
-- Restrict donations_summary SELECT to admins only (not team)
DROP POLICY IF EXISTS "donations readable by admin or team" ON public.donations_summary;
CREATE POLICY "donations readable by admin only"
  ON public.donations_summary FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Remove anon insert capability on entertainment_submissions; route through server fn
DROP POLICY IF EXISTS "anyone can submit entertainment" ON public.entertainment_submissions;
-- (insertion will now happen via a server function using service role)
