REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_phone_digits(text) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_phone_digits(text) TO service_role;