
DROP POLICY IF EXISTS "admins manage categories" ON public.categories;
CREATE POLICY "admin or team manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));

DROP POLICY IF EXISTS "admins manage assignments" ON public.category_assignments;
CREATE POLICY "admin or team manage assignments" ON public.category_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));
