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
    v_ip := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    v_ua := current_setting('request.headers', true)::jsonb ->> 'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL; v_ua := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_target_id := (to_jsonb(OLD)->>'id');
    v_meta := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_id := (to_jsonb(NEW)->>'id');
    v_meta := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_target_id := (to_jsonb(NEW)->>'id');
    v_meta := jsonb_build_object('new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_log
    (user_id, phone_normalized, display_name, action, target_type, target_id, ip, user_agent, metadata, success)
  VALUES
    (v_uid, v_phone, v_name, TG_OP || ' ' || TG_TABLE_NAME, TG_TABLE_NAME, v_target_id, v_ip, v_ua, v_meta, true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rsvps','team_messages','category_messages','invitations',
    'user_roles','category_assignments','inviters','team_invites',
    'guest_messages','cuisine_preorders','entertainment_submissions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      t
    );
  END LOOP;
END $$;