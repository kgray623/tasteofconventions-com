CREATE OR REPLACE FUNCTION private.is_current_user_committee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  WITH me AS (
    SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') AS digits
    FROM auth.users
    WHERE id = auth.uid()
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.invitations i
    CROSS JOIN me
    WHERE i.is_committee = true
      AND me.digits IS NOT NULL
      AND i.guest_phone_normalized = me.digits
  );
$$;
REVOKE ALL ON FUNCTION private.is_current_user_committee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_current_user_committee() FROM anon;
GRANT EXECUTE ON FUNCTION private.is_current_user_committee() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_current_user_committee() TO service_role;

DROP POLICY "Authorized users can view meal text history" ON public.meal_text_events;
CREATE POLICY "Authorized users can view meal text history"
ON public.meal_text_events FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR private.is_current_user_committee()
);

DROP POLICY "Authorized users can view meal text evidence reviews" ON public.meal_text_evidence_reviews;
CREATE POLICY "Authorized users can view meal text evidence reviews"
ON public.meal_text_evidence_reviews FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR private.is_current_user_committee()
);

DROP POLICY IF EXISTS "Staff and committee can view meal text sends" ON public.meal_text_sends;
CREATE POLICY "Staff and committee can view meal text sends"
ON public.meal_text_sends FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR private.is_current_user_committee()
);

DROP POLICY IF EXISTS "Staff and committee can view zelle text sends" ON public.meal_zelle_text_sends;
DROP POLICY IF EXISTS "Staff and committee can view meal zelle text sends" ON public.meal_zelle_text_sends;
CREATE POLICY "Staff and committee can view zelle text sends"
ON public.meal_zelle_text_sends FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR private.is_current_user_committee()
);

DROP FUNCTION public.is_current_user_committee();