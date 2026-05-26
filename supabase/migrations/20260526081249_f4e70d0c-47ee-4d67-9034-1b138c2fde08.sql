ALTER TABLE public.cuisine_preorders
ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES public.invitations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cuisine_preorders_invitation_id_key'
      AND conrelid = 'public.cuisine_preorders'::regclass
  ) THEN
    ALTER TABLE public.cuisine_preorders
    ADD CONSTRAINT cuisine_preorders_invitation_id_key UNIQUE (invitation_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cuisine_preorders_created_at
ON public.cuisine_preorders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cuisine_preorders_invitation_id
ON public.cuisine_preorders(invitation_id);

CREATE OR REPLACE FUNCTION public.set_cuisine_preorders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_cuisine_preorders_updated_at ON public.cuisine_preorders;
CREATE TRIGGER set_cuisine_preorders_updated_at
BEFORE UPDATE ON public.cuisine_preorders
FOR EACH ROW
EXECUTE FUNCTION public.set_cuisine_preorders_updated_at();