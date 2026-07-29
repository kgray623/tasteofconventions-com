CREATE OR REPLACE FUNCTION public.admin_delete_rows(
  _table text,
  _column text,
  _value uuid,
  _reason text,
  _actor_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  n int;
  actor_id uuid := COALESCE(auth.uid(), _actor_user_id);
  allowed_tables text[] := ARRAY[
    'invitations','rsvps','inviters','team_invites','cuisine_preorders'
  ];
  allowed_columns text[] := ARRAY['id','invitation_id'];
BEGIN
  IF actor_id IS NULL OR NOT private.has_role(actor_id, 'admin'::public.app_role) THEN
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
    actor_id,
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
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_rows(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_rows(text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_rows(text, text, uuid, text, uuid) TO service_role;