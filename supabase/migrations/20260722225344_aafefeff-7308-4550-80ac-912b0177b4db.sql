
-- Drop the guard from tables we no longer want to protect
DROP TRIGGER IF EXISTS aaa_guard_protected_delete ON public.user_roles;
DROP TRIGGER IF EXISTS aaa_guard_protected_delete ON public.category_assignments;

-- Update admin_delete_rows whitelist to match
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
    'invitations','rsvps','inviters','team_invites','cuisine_preorders'
  ];
  allowed_columns text[] := ARRAY['id','invitation_id'];
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

-- Broaden system_delete_rows whitelist for server-side cleanup jobs
CREATE OR REPLACE FUNCTION public.system_delete_rows(
  _table text,
  _column text,
  _value uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
  allowed_tables text[] := ARRAY['cuisine_preorders','team_invites','rsvps'];
  allowed_columns text[] := ARRAY['id','invitation_id','user_id'];
BEGIN
  IF NOT (_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED: %', _table USING ERRCODE = '22023';
  END IF;
  IF NOT (_column = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'COLUMN_NOT_ALLOWED: %', _column USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (user_id, action, target_type, target_id, metadata, success)
  VALUES (
    NULL,
    'SYSTEM DELETE ' || _table,
    _table,
    _value::text,
    jsonb_build_object('column', _column, 'value', _value, 'origin', 'system'),
    true
  );

  PERFORM set_config('app.delete_authorized', 'yes', true);
  EXECUTE format('DELETE FROM public.%I WHERE %I = $1', _table, _column) USING _value;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.delete_authorized', 'no', true);
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.system_delete_rows(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.system_delete_rows(text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.system_delete_rows(text, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.system_delete_rows(text, text, uuid) TO service_role;
