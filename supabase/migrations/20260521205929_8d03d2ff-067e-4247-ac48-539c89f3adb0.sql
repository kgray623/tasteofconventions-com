DROP POLICY IF EXISTS "anon reads guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "public read guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "host or admin reads guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "admin/team update read flags" ON public.guest_messages;
DROP POLICY IF EXISTS "host or admin insert admin replies" ON public.guest_messages;
DROP POLICY IF EXISTS "team/admin insert admin replies" ON public.guest_messages;
DROP POLICY IF EXISTS "public insert guest messages" ON public.guest_messages;

CREATE POLICY "public can only create guest-originated messages"
  ON public.guest_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (sender = 'guest'::text AND user_id IS NULL);

CREATE POLICY "admins or hosts read guest messages"
  ON public.guest_messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = guest_messages.invitation_id
        AND i.host_id = auth.uid()
    )
  );

CREATE POLICY "admins or hosts create host replies"
  ON public.guest_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'admin'::text
    AND user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.invitations i
        WHERE i.id = guest_messages.invitation_id
          AND i.host_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins or hosts update read flags"
  ON public.guest_messages
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = guest_messages.invitation_id
        AND i.host_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = guest_messages.invitation_id
        AND i.host_id = auth.uid()
    )
  );