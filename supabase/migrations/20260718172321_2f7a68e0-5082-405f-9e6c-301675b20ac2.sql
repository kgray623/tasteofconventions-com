-- Explicit belt-and-suspenders REVOKE on tables that already lack anon policies.
REVOKE ALL ON public.inviters FROM anon, PUBLIC;
REVOKE ALL ON public.guest_messages FROM anon, PUBLIC;
REVOKE ALL ON public.entertainment_submissions FROM anon, PUBLIC;
REVOKE ALL ON public.rsvps FROM anon, PUBLIC;

-- Lock internal-only SECURITY DEFINER functions so anon/authenticated cannot
-- invoke them via PostgREST. Triggers, service_role, and postgres still can.
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_deleted_row() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_team_invite() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_preorder_by_phone() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_invitation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.detect_duplicate_invitations() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_cuisine_preorders_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_team_invite_phone_normalized() FROM anon, authenticated, PUBLIC;
