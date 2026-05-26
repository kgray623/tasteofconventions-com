DROP TRIGGER IF EXISTS invitations_set_rsvp_expiry ON public.invitations;
DROP FUNCTION IF EXISTS public.set_rsvp_expiry() CASCADE;
ALTER TABLE public.invitations DROP COLUMN IF EXISTS rsvp_expires_at;