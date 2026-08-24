-- admin_exists() is only used by the signed-in admin landing page; remove anon access.
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon;

-- get_my_roles() is self-scoped (auth.uid() only) and must stay callable with an
-- expired/absent session so the UI degrades to "no roles" instead of erroring.
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO anon, authenticated;