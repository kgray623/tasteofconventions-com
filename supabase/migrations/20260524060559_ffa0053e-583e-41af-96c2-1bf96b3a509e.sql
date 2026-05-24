ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_rsvp_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_sent_at IS NOT NULL THEN
    NEW.rsvp_expires_at := NEW.invite_sent_at + interval '7 days';
  ELSE
    NEW.rsvp_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_set_rsvp_expiry ON public.invitations;
CREATE TRIGGER invitations_set_rsvp_expiry
BEFORE INSERT OR UPDATE OF invite_sent_at ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.set_rsvp_expiry();
