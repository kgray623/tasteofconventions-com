DROP POLICY "creators or admins update events" ON public.events;
CREATE POLICY "creators or admins update events" ON public.events
  FOR UPDATE
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "host or admin updates invitations" ON public.invitations;
CREATE POLICY "host or admin updates invitations" ON public.invitations
  FOR UPDATE
  USING ((auth.uid() = host_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = host_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);