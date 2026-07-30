CREATE OR REPLACE FUNCTION public.link_invitation_inviter_from_rsvp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resolved_inviter_id uuid;
BEGIN
  IF NEW.invitation_id IS NULL OR NEW.invited_by IS NULL OR btrim(NEW.invited_by) = '' THEN
    RETURN NEW;
  END IF;

  resolved_inviter_id := public.resolve_referral_inviter_id(NEW.invited_by);

  -- Never clear an existing assignment: only apply a confident, resolved match.
  IF resolved_inviter_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.invitations inv
  SET inviter_id = resolved_inviter_id
  WHERE inv.id = NEW.invitation_id
    AND inv.inviter_id IS DISTINCT FROM resolved_inviter_id;

  RETURN NEW;
END;
$function$;