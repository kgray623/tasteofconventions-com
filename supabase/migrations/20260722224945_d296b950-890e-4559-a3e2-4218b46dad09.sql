
-- 1) Guard trigger function: blocks any DELETE unless the current transaction
--    has authorized it via admin_delete_rows() (which sets app.delete_authorized='yes').
CREATE OR REPLACE FUNCTION public.guard_protected_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.delete_authorized', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'PROTECTED_DELETE: deletion of % must go through the admin delete flow', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END;
$$;

-- 2) Attach guard trigger to each protected table. Prefix 'aaa_' so it fires
--    before the existing archive_deleted_row trigger (alphabetical order).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'invitations','rsvps','inviters','team_invites',
    'cuisine_preorders','user_roles','category_assignments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS aaa_guard_protected_delete ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER aaa_guard_protected_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_protected_delete()',
      t
    );
  END LOOP;
END $$;

-- 3) Admin delete RPC. Verifies admin role, requires a reason, whitelists
--    tables and columns, writes a CLAIM DELETE audit row, then deletes.
CREATE OR REPLACE FUNCTION public.admin_delete_rows(
  _table text,
  _column text,
  _value uuid,
  _reason text
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
  allowed_tables text[] := ARRAY[
    'invitations','rsvps','inviters','team_invites',
    'cuisine_preorders','user_roles','category_assignments'
  ];
  allowed_columns text[] := ARRAY['id','invitation_id','user_id'];
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'REASON_REQUIRED: provide a reason of at least 5 characters'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED: %', _table USING ERRCODE = '22023';
  END IF;

  IF NOT (_column = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'COLUMN_NOT_ALLOWED: %', _column USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (user_id, action, target_type, target_id, metadata, success)
  VALUES (
    auth.uid(),
    'CLAIM DELETE ' || _table,
    _table,
    _value::text,
    jsonb_build_object('column', _column, 'value', _value, 'reason', btrim(_reason)),
    true
  );

  PERFORM set_config('app.delete_authorized', 'yes', true);
  EXECUTE format('DELETE FROM public.%I WHERE %I = $1', _table, _column) USING _value;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.delete_authorized', 'no', true);
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_rows(text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_rows(text, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_rows(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_rows(text, text, uuid, text) TO service_role;
