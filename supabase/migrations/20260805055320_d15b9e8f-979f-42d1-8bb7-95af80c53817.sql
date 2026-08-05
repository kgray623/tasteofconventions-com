REVOKE ALL ON FUNCTION public.sync_invitation_host_to_inviter() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_invitation_host_to_inviter() FROM anon;
REVOKE ALL ON FUNCTION public.sync_invitation_host_to_inviter() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invitation_host_to_inviter() TO service_role;