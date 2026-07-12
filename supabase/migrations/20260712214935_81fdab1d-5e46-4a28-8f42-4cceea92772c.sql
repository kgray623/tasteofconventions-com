
-- events: restrict update policy to authenticated role
DROP POLICY IF EXISTS "creators or admins update events" ON public.events;
CREATE POLICY "creators or admins update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

-- invitations: restrict update policy to authenticated role
DROP POLICY IF EXISTS "host or admin updates invitations" ON public.invitations;
CREATE POLICY "host or admin updates invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING ((auth.uid() = host_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = host_id) OR has_role(auth.uid(), 'admin'::app_role));

-- profiles: restrict update policy to authenticated role
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- cuisine_preorders: add explicit admin/team INSERT and UPDATE policies
-- (client writes still go through server functions; service_role bypasses RLS)
CREATE POLICY "admin or team insert cuisine preorders"
  ON public.cuisine_preorders FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));

CREATE POLICY "admin or team update cuisine preorders"
  ON public.cuisine_preorders FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));

-- guest_messages: allow guests to read and send their own messages
CREATE POLICY "guests read own messages"
  ON public.guest_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "guests send own messages"
  ON public.guest_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender = 'guest'::text AND user_id = auth.uid());

CREATE POLICY "guests update own read flags"
  ON public.guest_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
