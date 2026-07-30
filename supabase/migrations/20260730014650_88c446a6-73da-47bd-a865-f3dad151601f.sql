CREATE OR REPLACE FUNCTION public.count_referral_matches(_raw_name text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  norm text;
  norm_alias text;
  tokens text[];
  first_token text;
  last_token text;
  c int := 0;
BEGIN
  norm := public.normalize_referral_name(_raw_name);
  IF norm IS NULL OR norm = '' OR norm = '__other__' THEN
    RETURN 0;
  END IF;

  norm_alias := CASE norm
    WHEN 'myisha woods' THEN 'mysha woods'
    WHEN 'jamie elker' THEN 'jamy elker'
    ELSE norm
  END;

  SELECT count(*) INTO c
  FROM public.inviters i
  WHERE i.active = true
    AND public.normalize_referral_name(i.name) IN (norm, norm_alias);

  IF c > 0 THEN
    RETURN c;
  END IF;

  tokens := regexp_split_to_array(norm_alias, '\s+');
  IF array_length(tokens, 1) >= 2 THEN
    first_token := tokens[1];
    last_token := tokens[array_length(tokens, 1)];

    SELECT count(*) INTO c
    FROM public.inviters i
    WHERE i.active = true
      AND split_part(public.normalize_referral_name(i.name), ' ', 1) = first_token
      AND (
        regexp_split_to_array(public.normalize_referral_name(i.name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(i.name), '\s+'), 1)] = last_token;

    IF c > 0 THEN
      RETURN c;
    END IF;
  END IF;

  SELECT count(DISTINCT ref.inviter_id) INTO c
  FROM public.invitations ref
  WHERE ref.inviter_id IS NOT NULL
    AND public.normalize_referral_name(ref.guest_name) IN (norm, norm_alias);

  RETURN COALESCE(c, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.count_referral_matches(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_referral_matches(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.link_invitation_inviter_from_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resolved_inviter_id uuid;
  prev_inviter_id uuid;
  prev_name text;
  new_name text;
  norm text;
  match_count int := 0;
  outcome text;
  rows_changed int := 0;
BEGIN
  IF NEW.invitation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT inv.inviter_id INTO prev_inviter_id
  FROM public.invitations inv WHERE inv.id = NEW.invitation_id;

  norm := public.normalize_referral_name(NEW.invited_by);

  IF NEW.invited_by IS NULL OR btrim(NEW.invited_by) = '' THEN
    outcome := 'no_referral_text';
  ELSE
    match_count := public.count_referral_matches(NEW.invited_by);
    resolved_inviter_id := public.resolve_referral_inviter_id(NEW.invited_by);

    IF resolved_inviter_id IS NULL THEN
      outcome := CASE WHEN match_count > 1 THEN 'ambiguous_preserved' ELSE 'unresolved_preserved' END;
    ELSIF resolved_inviter_id IS NOT DISTINCT FROM prev_inviter_id THEN
      outcome := 'unchanged_same_match';
    ELSE
      UPDATE public.invitations inv
      SET inviter_id = resolved_inviter_id
      WHERE inv.id = NEW.invitation_id
        AND inv.inviter_id IS DISTINCT FROM resolved_inviter_id;
      GET DIAGNOSTICS rows_changed = ROW_COUNT;
      outcome := CASE WHEN rows_changed > 0 THEN 'reassigned' ELSE 'unchanged_no_write' END;
    END IF;
  END IF;

  SELECT name INTO prev_name FROM public.inviters WHERE id = prev_inviter_id;
  SELECT name INTO new_name FROM public.inviters WHERE id = resolved_inviter_id;

  INSERT INTO public.audit_log (user_id, action, target_type, target_id, metadata, success)
  VALUES (
    auth.uid(),
    'RSVP INVITER LINK ' || outcome,
    'invitations',
    NEW.invitation_id::text,
    jsonb_build_object(
      'rsvp_id', NEW.id,
      'invited_by_raw', NEW.invited_by,
      'invited_by_normalized', norm,
      'match_count', match_count,
      'resolved_inviter_id', resolved_inviter_id,
      'resolved_inviter_name', new_name,
      'previous_inviter_id', prev_inviter_id,
      'previous_inviter_name', prev_name,
      'changed', (outcome = 'reassigned'),
      'outcome', outcome,
      'trigger_op', TG_OP
    ),
    true
  );

  RETURN NEW;
END;
$function$;