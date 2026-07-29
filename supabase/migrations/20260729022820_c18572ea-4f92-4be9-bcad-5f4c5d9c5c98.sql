CREATE OR REPLACE FUNCTION public.normalize_referral_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(btrim(coalesce(_name, ''))),
          '^(sister|sis|sr|brother|bro|br|elder|pastor|pr|dr|mr|mrs|ms)\.?\s+',
          '',
          'i'
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.normalize_referral_name(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_referral_name(text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_referral_inviter_id(_raw_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_referral_inviter_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_referral_inviter_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.link_invitation_inviter_from_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resolved_inviter_id uuid;
BEGIN
  IF NEW.invitation_id IS NULL OR NEW.invited_by IS NULL OR btrim(NEW.invited_by) = '' THEN
    RETURN NEW;
  END IF;

  resolved_inviter_id := public.resolve_referral_inviter_id(NEW.invited_by);

  UPDATE public.invitations inv
  SET inviter_id = resolved_inviter_id
  WHERE inv.id = NEW.invitation_id
    AND inv.inviter_id IS DISTINCT FROM resolved_inviter_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.link_invitation_inviter_from_rsvp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_invitation_inviter_from_rsvp() TO service_role;

DROP TRIGGER IF EXISTS trg_link_invitation_inviter_from_rsvp ON public.rsvps;
CREATE TRIGGER trg_link_invitation_inviter_from_rsvp
AFTER INSERT OR UPDATE OF invited_by, invitation_id ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.link_invitation_inviter_from_rsvp();