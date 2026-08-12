CREATE OR REPLACE FUNCTION public.is_current_user_committee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
REVOKE ALL ON FUNCTION public.is_current_user_committee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_user_committee() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_committee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_committee() TO service_role;