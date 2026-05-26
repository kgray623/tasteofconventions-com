CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_phone(_phone text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM auth.users WHERE phone = _phone LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) TO service_role;