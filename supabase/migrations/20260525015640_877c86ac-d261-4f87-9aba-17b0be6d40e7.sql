
-- Make email optional on team_invites
ALTER TABLE public.team_invites ALTER COLUMN email DROP NOT NULL;

-- Add normalized phone column
ALTER TABLE public.team_invites ADD COLUMN IF NOT EXISTS phone_normalized text;

-- Backfill phone_normalized from phone (digits only)
UPDATE public.team_invites
SET phone_normalized = regexp_replace(coalesce(phone, ''), '\D', '', 'g')
WHERE phone IS NOT NULL AND phone_normalized IS NULL;

-- Index for matching
CREATE INDEX IF NOT EXISTS team_invites_phone_normalized_idx
  ON public.team_invites (phone_normalized)
  WHERE accepted_at IS NULL;

-- Keep phone_normalized in sync via trigger
CREATE OR REPLACE FUNCTION public.set_team_invite_phone_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.phone_normalized := nullif(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_invites_set_phone_normalized ON public.team_invites;
CREATE TRIGGER team_invites_set_phone_normalized
BEFORE INSERT OR UPDATE OF phone ON public.team_invites
FOR EACH ROW EXECUTE FUNCTION public.set_team_invite_phone_normalized();

-- Replace apply_team_invite: match by phone from signup metadata
CREATE OR REPLACE FUNCTION public.apply_team_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv public.team_invites%ROWTYPE;
  signup_phone text;
BEGIN
  signup_phone := nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), '\D', '', 'g'), '');
  IF signup_phone IS NULL OR length(signup_phone) < 7 THEN
    RETURN NEW;
  END IF;
  SELECT * INTO inv FROM public.team_invites
   WHERE phone_normalized = signup_phone AND accepted_at IS NULL
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role)
      ON CONFLICT DO NOTHING;
    UPDATE public.team_invites SET accepted_at = now() WHERE id = inv.id;
  END IF;
  RETURN NEW;
END $$;
