DROP POLICY IF EXISTS "admins or hosts read guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "admins or hosts create host replies" ON public.guest_messages;
DROP POLICY IF EXISTS "admins or hosts update read flags" ON public.guest_messages;

CREATE POLICY "admins read guest messages"
  ON public.guest_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins create host replies"
  ON public.guest_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'admin'::text
    AND user_id = auth.uid()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "admins update read flags"
  ON public.guest_messages
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));