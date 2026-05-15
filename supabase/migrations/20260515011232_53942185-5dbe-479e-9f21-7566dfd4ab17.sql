
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'host', 'guest');
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'yes', 'no', 'maybe');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "user roles readable by self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default host role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants readable by all" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "admins manage restaurants" ON public.restaurants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  dietary_flags TEXT[] DEFAULT '{}',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu readable by all" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "admins manage menu" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  virtual_link TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable by all" ON public.events FOR SELECT USING (true);
CREATE POLICY "authenticated create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "creators or admins update events" ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "creators or admins delete events" ON public.events FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_email_normalized TEXT GENERATED ALWAYS AS (lower(trim(guest_email))) STORED,
  guest_phone_normalized TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(guest_phone,''), '[^0-9]', '', 'g')) STORED,
  notes TEXT,
  rsvp_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invitations_email_idx ON public.invitations(event_id, guest_email_normalized);
CREATE INDEX invitations_phone_idx ON public.invitations(event_id, guest_phone_normalized);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read invitations" ON public.invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "host creates invitations" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "host or admin updates invitations" ON public.invitations FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "host or admin deletes invitations" ON public.invitations FOR DELETE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

-- Duplicate flags (auto-populated by trigger)
CREATE TABLE public.duplicate_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_a UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  invitation_b UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invitation_a, invitation_b, match_type)
);
ALTER TABLE public.duplicate_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read flags" ON public.duplicate_flags FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.detect_duplicate_invitations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.guest_email_normalized IS NOT NULL AND NEW.guest_email_normalized <> '' THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'email'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_email_normalized = NEW.guest_email_normalized
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.guest_phone_normalized IS NOT NULL AND length(NEW.guest_phone_normalized) >= 7 THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'phone'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_phone_normalized = NEW.guest_phone_normalized
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER invitations_dupe_check AFTER INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.detect_duplicate_invitations();

-- RSVPs (one per invitation)
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'pending',
  party_size INT NOT NULL DEFAULT 1,
  dietary_notes TEXT,
  message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rsvps" ON public.rsvps FOR SELECT TO authenticated USING (true);
-- Public RSVP write goes through server function with admin client, so no anon policies needed.

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);

-- Seed: a default event + sample restaurants
INSERT INTO public.events (id, title, description, starts_at, location)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'A Taste of Special Conventions',
  'An unforgettable evening of curated cuisine, conversation, and connection.',
  now() + interval '30 days',
  'The Grand Hall'
);

INSERT INTO public.restaurants (name, description, cuisine) VALUES
  ('Maison Laurent', 'Refined French bistro with seasonal tasting menus.', 'French'),
  ('Sakura House', 'Hand-rolled sushi and small plates from Tokyo.', 'Japanese'),
  ('Olive & Vine', 'Mediterranean shared plates and wood-fired flatbreads.', 'Mediterranean'),
  ('Casa Verde', 'Modern plant-forward kitchen with bold spices.', 'Vegetarian');
