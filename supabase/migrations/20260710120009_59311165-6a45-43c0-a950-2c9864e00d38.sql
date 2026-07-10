DROP POLICY IF EXISTS "host creates invitations" ON public.invitations;

CREATE POLICY "host team or admin creates invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = host_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);