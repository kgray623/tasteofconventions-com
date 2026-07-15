-- Lock down SECURITY DEFINER functions that are not meant to be called by clients.
-- Trigger functions, email queue infra, and pure internal helpers do not need
-- EXECUTE for anon or authenticated. Client-called RPCs (has_role,
-- is_current_user_committee, get_public_inviters, get_my_chat_unread,
-- claim_admin, ensure_committee_team_role, get_auth_user_id_by_phone(_digits),
-- search_invitations_fuzzy) are intentionally left callable.

-- Trigger functions (only fired by table triggers; never called directly).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_invitation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_duplicate_invitations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_deleted_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_team_invite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_preorder_by_phone() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_team_invite_phone_normalized() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_cuisine_preorders_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

-- Email queue infrastructure (called by cron/service_role only).
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Pure helpers used only inside other SQL / triggers (not RPC'd from client).
REVOKE EXECUTE ON FUNCTION public.normalize_name_for_match(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_preorder_selection(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_preorder_selections(jsonb, jsonb) FROM PUBLIC, anon, authenticated;