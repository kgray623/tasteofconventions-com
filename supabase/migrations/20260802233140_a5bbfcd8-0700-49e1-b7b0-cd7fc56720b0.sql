-- Defense-in-depth: make table privileges match the RLS policies that exist.
-- No schema or data changes.

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Public, read-only content used by the public invitation page.
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.invitation_content TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT ON public.restaurants TO anon, authenticated;

-- Signed-in privileges, derived from each table's policies.
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.duplicate_flags TO authenticated;
GRANT SELECT ON public.entertainment_submissions TO authenticated;
GRANT SELECT ON public.page_visits TO authenticated;
GRANT SELECT ON public.traffic_daily_rollup TO authenticated;

GRANT SELECT, DELETE ON public.deleted_rows_archive TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.category_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guest_messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_last_seen TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuisine_preorders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inviters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_duplicates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- email_send_log, email_send_state, email_unsubscribe_tokens, suppressed_emails:
-- policies allow service_role only, so no anon/authenticated grants.
