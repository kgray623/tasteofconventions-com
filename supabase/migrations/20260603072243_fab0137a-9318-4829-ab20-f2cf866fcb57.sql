-- Enable trigram extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Helper to normalize names for comparison (lowercase, strip non-letters)
CREATE OR REPLACE FUNCTION public.normalize_name_for_match(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(coalesce(_name, ''), '[^a-zA-Z]', '', 'g'));
$$;

-- Updated trigger: match phone by last 10 digits, and add fuzzy name matching
CREATE OR REPLACE FUNCTION public.detect_duplicate_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_phone_tail text;
  new_name_norm text;
BEGIN
  -- Email exact match
  IF NEW.guest_email_normalized IS NOT NULL AND NEW.guest_email_normalized <> '' THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'email'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_email_normalized = NEW.guest_email_normalized
    ON CONFLICT DO NOTHING;
  END IF;

  -- Phone match by last 10 digits (handles +1 country code differences)
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

  -- Fuzzy name match (trigram similarity >= 0.6)
  new_name_norm := public.normalize_name_for_match(NEW.guest_name);
  IF length(new_name_norm) >= 4 THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'name'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND length(public.normalize_name_for_match(i.guest_name)) >= 4
      AND similarity(public.normalize_name_for_match(i.guest_name), new_name_norm) >= 0.6
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: re-evaluate all existing invitations against the new rules
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.invitations LOOP
    UPDATE public.invitations SET guest_name = guest_name WHERE id = r.id;
  END LOOP;
END $$;