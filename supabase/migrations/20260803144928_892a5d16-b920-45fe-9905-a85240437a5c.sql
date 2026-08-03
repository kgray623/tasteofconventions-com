-- Guest-name rollup: when the typed referrer is a guest (nickname / near spelling),
-- credit the committee member who brought that guest. Only when exactly one owner.
CREATE OR REPLACE FUNCTION public.resolve_referral_inviter_id(_raw_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  norm text;
  norm_alias text;
  tokens text[];
  first_token text;
  last_token text;
  match_id uuid;
  match_count int;
BEGIN
  norm := public.normalize_referral_name(_raw_name);
  IF norm IS NULL OR norm = '' OR norm = '__other__' THEN
    RETURN NULL;
  END IF;

  norm_alias := CASE norm
    WHEN 'myisha woods' THEN 'mysha woods'
    WHEN 'jamie elker' THEN 'jamy elker'
    ELSE norm
  END;

  SELECT count(*), (array_agg(i.id ORDER BY i.created_at))[1]
    INTO match_count, match_id
  FROM public.inviters i
  WHERE i.active = true
    AND public.normalize_referral_name(i.name) IN (norm, norm_alias);

  IF match_count = 1 THEN
    RETURN match_id;
  END IF;

  tokens := regexp_split_to_array(norm_alias, '\s+');
  IF array_length(tokens, 1) >= 2 THEN
    first_token := tokens[1];
    last_token := tokens[array_length(tokens, 1)];

    SELECT count(*), (array_agg(i.id ORDER BY i.created_at))[1]
      INTO match_count, match_id
    FROM public.inviters i
    WHERE i.active = true
      AND split_part(public.normalize_referral_name(i.name), ' ', 1) = first_token
      AND (
        regexp_split_to_array(public.normalize_referral_name(i.name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(i.name), '\s+'), 1)] = last_token;

    IF match_count = 1 THEN
      RETURN match_id;
    END IF;
  END IF;

  SELECT count(DISTINCT ref.inviter_id), (array_agg(DISTINCT ref.inviter_id))[1]
    INTO match_count, match_id
  FROM public.invitations ref
  WHERE ref.inviter_id IS NOT NULL
    AND public.normalize_referral_name(ref.guest_name) IN (norm, norm_alias);

  IF match_count = 1 THEN
    RETURN match_id;
  END IF;

  IF array_length(tokens, 1) >= 2 THEN
    SELECT count(DISTINCT ref.inviter_id), (array_agg(DISTINCT ref.inviter_id))[1]
      INTO match_count, match_id
    FROM public.invitations ref
    WHERE ref.inviter_id IS NOT NULL
      AND split_part(public.normalize_referral_name(ref.guest_name), ' ', 1) = first_token
      AND (
        regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+'), 1)] = last_token;

    IF match_count = 1 THEN
      RETURN match_id;
    END IF;

    -- Nickname / near-spelling guest rollup: same last name, first names that
    -- share a 3+ character prefix or are fuzzy-similar ("Jennifer" ~ "Jenny").
    SELECT count(DISTINCT ref.inviter_id), (array_agg(DISTINCT ref.inviter_id))[1]
      INTO match_count, match_id
    FROM public.invitations ref
    WHERE ref.inviter_id IS NOT NULL
      AND (
        regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+'), 1)] = last_token
      AND length(last_token) >= 3
      AND (
        left(split_part(public.normalize_referral_name(ref.guest_name), ' ', 1), 3) = left(first_token, 3)
        OR similarity(split_part(public.normalize_referral_name(ref.guest_name), ' ', 1), first_token) >= 0.5
      );

    IF match_count = 1 THEN
      RETURN match_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_referral_matches(_raw_name text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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

  IF c > 0 THEN
    RETURN c;
  END IF;

  IF array_length(tokens, 1) >= 2 THEN
    SELECT count(DISTINCT ref.inviter_id) INTO c
    FROM public.invitations ref
    WHERE ref.inviter_id IS NOT NULL
      AND split_part(public.normalize_referral_name(ref.guest_name), ' ', 1) = first_token
      AND (
        regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+'), 1)] = last_token;

    IF c > 0 THEN
      RETURN c;
    END IF;

    SELECT count(DISTINCT ref.inviter_id) INTO c
    FROM public.invitations ref
    WHERE ref.inviter_id IS NOT NULL
      AND (
        regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+')
      )[array_length(regexp_split_to_array(public.normalize_referral_name(ref.guest_name), '\s+'), 1)] = last_token
      AND length(last_token) >= 3
      AND (
        left(split_part(public.normalize_referral_name(ref.guest_name), ' ', 1), 3) = left(first_token, 3)
        OR similarity(split_part(public.normalize_referral_name(ref.guest_name), ' ', 1), first_token) >= 0.5
      );
  END IF;

  RETURN COALESCE(c, 0);
END;
$function$;