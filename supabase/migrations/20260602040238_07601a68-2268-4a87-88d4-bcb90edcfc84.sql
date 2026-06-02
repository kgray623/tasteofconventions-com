
CREATE POLICY "users self-assign volunteer"
ON public.category_assignments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users remove own assignment"
ON public.category_assignments
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));

CREATE POLICY "assignments readable by all authenticated"
ON public.category_assignments
FOR SELECT
TO authenticated
USING (true);
