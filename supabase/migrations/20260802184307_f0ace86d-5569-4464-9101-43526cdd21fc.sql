CREATE TABLE public.referral_duplicates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  claimed_by_inviter_id uuid NOT NULL REFERENCES public.inviters(id) ON DELETE CASCADE,
  owner_inviter_id uuid REFERENCES public.inviters(id) ON DELETE SET NULL,
  source_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, claimed_by_inviter_id)
);

GRANT SELECT ON public.referral_duplicates TO authenticated;
GRANT ALL ON public.referral_duplicates TO service_role;

ALTER TABLE public.referral_duplicates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referral duplicates"
ON public.referral_duplicates
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Committee can view their own referral duplicates"
ON public.referral_duplicates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inviters i
    WHERE (i.id = referral_duplicates.claimed_by_inviter_id OR i.id = referral_duplicates.owner_inviter_id)
      AND i.host_id = auth.uid()
  )
  OR private.has_role(auth.uid(), 'team'::public.app_role)
);

CREATE TRIGGER set_referral_duplicates_updated_at
BEFORE UPDATE ON public.referral_duplicates
FOR EACH ROW EXECUTE FUNCTION public.set_cuisine_preorders_updated_at();

CREATE INDEX idx_referral_duplicates_claimed_by ON public.referral_duplicates (claimed_by_inviter_id);
CREATE INDEX idx_referral_duplicates_invitation ON public.referral_duplicates (invitation_id);