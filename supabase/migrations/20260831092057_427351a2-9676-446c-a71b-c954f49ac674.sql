DROP POLICY IF EXISTS "Users delete own comments and admins delete any" ON public.photo_comments;
CREATE POLICY "Users delete own comments and admins delete any"
ON public.photo_comments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);