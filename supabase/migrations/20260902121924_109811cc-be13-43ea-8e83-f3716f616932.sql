REVOKE ALL ON FUNCTION public.set_album_engagement_profile_name() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_album_engagement_profile_name() FROM anon;
REVOKE ALL ON FUNCTION public.set_album_engagement_profile_name() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_album_engagement_profile_name() TO service_role;