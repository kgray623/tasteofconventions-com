
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable by authenticated" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id uuid,
  volunteer_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments readable by authenticated" ON public.category_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage assignments" ON public.category_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text GENERATED ALWAYS AS (lower(trim(email))) STORED,
  role public.app_role NOT NULL DEFAULT 'team',
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_normalized)
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invites" ON public.team_invites
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users read own invite" ON public.team_invites
  FOR SELECT TO authenticated USING (email_normalized = lower(auth.email()));

CREATE OR REPLACE FUNCTION public.apply_team_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.team_invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.team_invites
   WHERE email_normalized = lower(NEW.email) AND accepted_at IS NULL LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role)
      ON CONFLICT DO NOTHING;
    UPDATE public.team_invites SET accepted_at = now() WHERE id = inv.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS apply_team_invite_after_user ON auth.users;
CREATE TRIGGER apply_team_invite_after_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.apply_team_invite();

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;

CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads chat" ON public.team_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team'));
CREATE POLICY "team posts chat" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND
    (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'team')));
CREATE POLICY "author or admin deletes" ON public.team_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER TABLE public.team_messages REPLICA IDENTITY FULL;

INSERT INTO public.categories (name, sort_order) VALUES
  ('Entertainment', 10),('Security', 20),('Photo Booth', 30),('Sounds', 40),
  ('Video', 50),('Parking Attendants', 60),('Food Servers', 70),
  ('Food Organizer', 80),('Alcohol', 90),('Director of the Feast', 100),
  ('Set Up', 110),('Clean Up', 120),('Donations', 130),('MC', 140),
  ('Prayer', 150),('Czech', 160),('AI Invitations', 170)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.category_assignments (category_id, volunteer_name, notes)
SELECT id, 'Pat Monahan', NULL FROM public.categories WHERE name='Photo Booth'
UNION ALL SELECT id, 'Jay Wilcher', NULL FROM public.categories WHERE name='Sounds'
UNION ALL SELECT id, 'Diete Folson', NULL FROM public.categories WHERE name='Food Servers'
UNION ALL SELECT id, 'Teresa Drake', 'invitation list' FROM public.categories WHERE name='AI Invitations';
