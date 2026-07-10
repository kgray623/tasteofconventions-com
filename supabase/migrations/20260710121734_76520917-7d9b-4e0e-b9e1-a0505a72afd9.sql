DROP POLICY IF EXISTS "host team or admin creates invitations" ON public.invitations;

CREATE POLICY "host team or admin creates invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() = host_id
    AND (
      public.has_role(auth.uid(), 'team'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'host'::public.app_role)
    )
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);