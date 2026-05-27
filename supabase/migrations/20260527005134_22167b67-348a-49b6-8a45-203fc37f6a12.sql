GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) TO service_role, authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_phone_digits(_digits text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users
  WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') = _digits
     OR right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(_digits, 10)
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone_digits(text) TO service_role, authenticated, anon;