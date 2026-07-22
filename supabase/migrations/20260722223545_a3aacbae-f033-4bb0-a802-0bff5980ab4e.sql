REVOKE ALL ON FUNCTION public.link_invitation_inviter_from_rsvp() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_invitation_inviter_from_rsvp() FROM anon;
REVOKE ALL ON FUNCTION public.link_invitation_inviter_from_rsvp() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.link_invitation_inviter_from_rsvp() TO service_role;