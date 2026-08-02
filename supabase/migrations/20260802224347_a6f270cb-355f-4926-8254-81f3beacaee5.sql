-- Replace the impossible self-insert rule
DROP POLICY IF EXISTS "users self-assign volunteer" ON public.category_assignments;

CREATE POLICY "users self-assign volunteer"
ON public.category_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    volunteer_name IS NULL
    OR btrim(volunteer_name) = btrim(coalesce((SELECT p.display_name FROM public.profiles p WHERE p.id = auth.uid()), ''))
  )
);

-- Let a person read their own assignments (admin/committee policy stays)
DROP POLICY IF EXISTS "users read own assignment" ON public.category_assignments;
CREATE POLICY "users read own assignment"
ON public.category_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_assignments TO authenticated;
GRANT ALL ON public.category_assignments TO service_role;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;