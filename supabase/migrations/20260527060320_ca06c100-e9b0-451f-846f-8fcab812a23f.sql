CREATE POLICY "team reads committee invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  is_committee = true
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role))
);