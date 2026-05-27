
CREATE OR REPLACE FUNCTION public.is_current_user_committee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') AS digits
    FROM auth.users WHERE id = auth.uid()
  )
  SELECT EXISTS (
    SELECT 1 FROM public.invitations i, me
    WHERE i.is_committee = true
      AND me.digits IS NOT NULL
      AND (
        i.guest_phone_normalized = me.digits
        OR right(coalesce(i.guest_phone_normalized, ''), 10) = right(me.digits, 10)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_committee() TO authenticated;
