
-- Restrict team members to only the guests they invited.
-- Admins keep full access.

-- INVITATIONS
DROP POLICY IF EXISTS "authenticated read invitations" ON public.invitations;
CREATE POLICY "host or admin reads invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

-- RSVPS (currently no insert/update/delete policies; only SELECT exists)
DROP POLICY IF EXISTS "auth read rsvps" ON public.rsvps;
CREATE POLICY "host or admin reads rsvps"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = rsvps.invitation_id AND i.host_id = auth.uid()
    )
  );

-- GUEST MESSAGES — keep guest-side public insert/read; restrict authenticated read
-- Guests (anon) must still be able to read their own thread by invitation_id.
-- Authenticated users (team/admin) should only see threads they host (admin sees all).
DROP POLICY IF EXISTS "public read guest messages" ON public.guest_messages;
CREATE POLICY "anon reads guest messages"
  ON public.guest_messages FOR SELECT
  TO anon
  USING (true);
CREATE POLICY "host or admin reads guest messages"
  ON public.guest_messages FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = guest_messages.invitation_id AND i.host_id = auth.uid()
    )
  );

-- Tighten admin/team reply insert so team can only reply on their own threads
DROP POLICY IF EXISTS "team/admin insert admin replies" ON public.guest_messages;
CREATE POLICY "host or admin insert admin replies"
  ON public.guest_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'admin'
    AND user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.invitations i
        WHERE i.id = guest_messages.invitation_id AND i.host_id = auth.uid()
      )
    )
  );

-- DUPLICATE FLAGS — team sees only flags where at least one side is their invite
DROP POLICY IF EXISTS "auth read flags" ON public.duplicate_flags;
CREATE POLICY "host or admin reads flags"
  ON public.duplicate_flags FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE (i.id = duplicate_flags.invitation_a OR i.id = duplicate_flags.invitation_b)
        AND i.host_id = auth.uid()
    )
  );
