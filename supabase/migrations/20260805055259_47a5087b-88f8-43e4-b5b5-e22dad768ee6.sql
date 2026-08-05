CREATE OR REPLACE FUNCTION public.sync_invitation_host_to_inviter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_host_id uuid;
BEGIN
  IF NEW.inviter_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT i.host_id
    INTO resolved_host_id
  FROM public.inviters i
  WHERE i.id = NEW.inviter_id;

  IF resolved_host_id IS NOT NULL THEN
    NEW.host_id := resolved_host_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_sync_invitation_host_to_inviter ON public.invitations;
CREATE TRIGGER zzz_sync_invitation_host_to_inviter
BEFORE INSERT OR UPDATE OF inviter_id, host_id ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.sync_invitation_host_to_inviter();