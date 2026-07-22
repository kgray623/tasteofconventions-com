
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
  allowed_tables text[] := ARRAY['cuisine_preorders'];
  allowed_columns text[] := ARRAY['id','invitation_id'];
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
