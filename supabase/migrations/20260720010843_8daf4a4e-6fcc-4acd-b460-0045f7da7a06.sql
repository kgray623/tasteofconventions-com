
-- Fix 1: enforce volunteer_name matches user's profile display_name
DROP POLICY IF EXISTS "users self-assign volunteer" ON public.category_assignments;
CREATE POLICY "users self-assign volunteer"
  ON public.category_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND volunteer_name IS NOT NULL
    AND btrim(volunteer_name) = btrim((SELECT display_name FROM public.profiles WHERE id = auth.uid()))
  );

-- Fix 2: controlled INSERT + DELETE policies on profiles
CREATE POLICY "users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
