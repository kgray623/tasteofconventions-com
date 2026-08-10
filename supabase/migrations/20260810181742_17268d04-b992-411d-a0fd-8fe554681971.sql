DROP POLICY IF EXISTS "authenticated create events" ON public.events;
CREATE POLICY "staff create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'team'::app_role))
);

DROP POLICY IF EXISTS "creators or admins update events" ON public.events;
CREATE POLICY "creators or admins update events"
ON public.events FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = created_by AND private.has_role(auth.uid(), 'team'::app_role))
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = created_by AND private.has_role(auth.uid(), 'team'::app_role))
);