CREATE TABLE public.meal_follow_up_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id uuid NOT NULL REFERENCES public.cuisine_preorders(id) ON DELETE CASCADE,
  cuisine text NOT NULL,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (preorder_id, cuisine)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_follow_up_notes TO authenticated;
GRANT ALL ON public.meal_follow_up_notes TO service_role;

ALTER TABLE public.meal_follow_up_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and team members can view all follow-up notes"
ON public.meal_follow_up_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'team')
  )
);

CREATE POLICY "Admins and team members can create follow-up notes"
ON public.meal_follow_up_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'team')
  )
);

CREATE POLICY "Admins and team members can update follow-up notes"
ON public.meal_follow_up_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'team')
  )
);

CREATE POLICY "Admins and team members can delete follow-up notes"
ON public.meal_follow_up_notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'team')
  )
);

CREATE OR REPLACE FUNCTION public.set_meal_follow_up_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER meal_follow_up_notes_updated_at
BEFORE UPDATE ON public.meal_follow_up_notes
FOR EACH ROW EXECUTE FUNCTION public.set_meal_follow_up_notes_updated_at();