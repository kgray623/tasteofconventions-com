CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone text;
  v_name text;
  v_target_id text;
  v_meta jsonb;
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_ua text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), ''),
      coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name')
    INTO v_phone, v_name
    FROM auth.users WHERE id = v_uid;
  END IF;

  BEGIN
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    v_ip := coalesce(v_headers->>'cf-connecting-ip', split_part(v_headers->>'x-forwarded-for', ',', 1));
    v_ua := v_headers->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
    v_ua := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_target_id := coalesce(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'key', to_jsonb(OLD)->>'user_id');
    v_meta := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', NULL,
      'operation', TG_OP,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_id := coalesce(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key', to_jsonb(NEW)->>'user_id');
    v_meta := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'operation', TG_OP,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'changed_fields', (
        SELECT coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
        FROM jsonb_each(to_jsonb(NEW)) n
        WHERE n.value IS DISTINCT FROM to_jsonb(OLD)->n.key
      )
    );
  ELSE
    v_target_id := coalesce(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key', to_jsonb(NEW)->>'user_id');
    v_meta := jsonb_build_object(
      'old', NULL,
      'new', to_jsonb(NEW),
      'operation', TG_OP,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME
    );
  END IF;

  INSERT INTO public.audit_log
    (user_id, phone_normalized, display_name, action, target_type, target_id, ip, user_agent, metadata, success)
  VALUES
    (v_uid, v_phone, v_name, TG_OP || ' ' || TG_TABLE_NAME, TG_TABLE_NAME, v_target_id, v_ip, v_ua, v_meta, true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  table_name text;
  audited_tables text[] := ARRAY[
    'app_settings',
    'categories',
    'category_assignments',
    'category_messages',
    'chat_last_seen',
    'cuisine_preorders',
    'events',
    'guest_messages',
    'invitations',
    'inviters',
    'meal_payments',
    'orders',
    'profiles',
    'referral_duplicates',
    'restaurants',
    'rsvps',
    'team_invites',
    'team_messages',
    'user_roles'
  ];
BEGIN
  FOREACH table_name IN ARRAY audited_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_HISTORY_IMMUTABLE: recorded platform activity cannot be changed or removed'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_update_delete ON public.audit_log;
CREATE TRIGGER prevent_audit_log_update_delete
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT, SELECT ON public.audit_log TO service_role;