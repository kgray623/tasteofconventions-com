DROP POLICY IF EXISTS "admin or team manage categories" ON public.categories;
DROP POLICY IF EXISTS "admin or team manage assignments" ON public.category_assignments;

CREATE POLICY "admins manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage assignments"
ON public.category_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));