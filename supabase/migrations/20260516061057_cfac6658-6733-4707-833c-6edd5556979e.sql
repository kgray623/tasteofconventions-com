
CREATE TABLE public.guest_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('guest','admin')),
  user_id uuid,
  body text NOT NULL,
  read_by_admin boolean NOT NULL DEFAULT false,
  read_by_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_messages_invitation ON public.guest_messages(invitation_id, created_at);

ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

-- Public can read/insert (guest UI uses rsvp_token from URL; we scope by invitation_id client-side).
CREATE POLICY "public read guest messages"
  ON public.guest_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public insert guest messages"
  ON public.guest_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (sender = 'guest');

CREATE POLICY "team/admin insert admin replies"
  ON public.guest_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender = 'admin' AND user_id = auth.uid()
              AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'team')));

CREATE POLICY "admin/team update read flags"
  ON public.guest_messages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'team'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_messages;
