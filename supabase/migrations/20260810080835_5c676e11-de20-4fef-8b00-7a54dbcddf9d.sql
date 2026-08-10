CREATE OR REPLACE FUNCTION public.detect_duplicate_invitations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_phone_tail text;
  new_name_norm text;
BEGIN
  IF NEW.guest_email_normalized IS NOT NULL AND NEW.guest_email_normalized <> '' THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'email'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_email_normalized = NEW.guest_email_normalized
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.guest_phone_normalized IS NOT NULL AND length(NEW.guest_phone_normalized) >= 7 THEN
    new_phone_tail := right(NEW.guest_phone_normalized, 10);
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'phone'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_phone_normalized IS NOT NULL
      AND length(i.guest_phone_normalized) >= 7
      AND right(i.guest_phone_normalized, 10) = new_phone_tail
    ON CONFLICT DO NOTHING;
  END IF;

  new_name_norm := public.normalize_name_for_match(NEW.guest_name);
  IF length(new_name_norm) >= 4 THEN
    -- Name similarity alone is not enough: two people can share a surname.
    -- Only flag when the phone numbers agree, or at least one side has none.
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'name'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND length(public.normalize_name_for_match(i.guest_name)) >= 4
      AND similarity(public.normalize_name_for_match(i.guest_name), new_name_norm) >= 0.6
      AND (
        NEW.guest_phone_normalized IS NULL OR length(NEW.guest_phone_normalized) < 7
        OR i.guest_phone_normalized IS NULL OR length(i.guest_phone_normalized) < 7
        OR right(i.guest_phone_normalized, 10) = right(NEW.guest_phone_normalized, 10)
      )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DELETE FROM public.duplicate_flags d
USING public.invitations a, public.invitations b
WHERE d.invitation_a = a.id
  AND d.invitation_b = b.id
  AND d.match_type = 'name'
  AND a.guest_phone_normalized IS NOT NULL AND length(a.guest_phone_normalized) >= 7
  AND b.guest_phone_normalized IS NOT NULL AND length(b.guest_phone_normalized) >= 7
  AND right(a.guest_phone_normalized, 10) <> right(b.guest_phone_normalized, 10);