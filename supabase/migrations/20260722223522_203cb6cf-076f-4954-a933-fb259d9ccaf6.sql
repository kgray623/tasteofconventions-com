CREATE OR REPLACE FUNCTION public.link_invitation_inviter_from_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  match_id uuid;
  match_count int;
  normalized_name text;
BEGIN
  IF NEW.invitation_id IS NULL OR NEW.invited_by IS NULL OR btrim(NEW.invited_by) = '' THEN
    RETURN NEW;
  END IF;

  normalized_name := lower(regexp_replace(btrim(NEW.invited_by), '\s+', ' ', 'g'));

  SELECT count(*), (array_agg(i.id ORDER BY i.created_at))[1]
    INTO match_count, match_id
  FROM public.inviters i
  WHERE i.active = true
    AND lower(regexp_replace(btrim(i.name), '\s+', ' ', 'g')) = normalized_name;

  IF match_count = 1 THEN
    UPDATE public.invitations inv
    SET inviter_id = match_id
    WHERE inv.id = NEW.invitation_id
      AND inv.inviter_id IS DISTINCT FROM match_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_invitation_inviter_from_rsvp ON public.rsvps;
CREATE TRIGGER trg_link_invitation_inviter_from_rsvp
AFTER INSERT OR UPDATE OF invited_by, invitation_id ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.link_invitation_inviter_from_rsvp();