-- Remove hardcoded email-based admin auto-grant from handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

-- Remove broad public-listing policy on the invitation-media bucket. Public-bucket
-- object URLs still work via the storage CDN endpoint; this only stops the
-- list-objects API from enumerating files.
DROP POLICY IF EXISTS "Public read invitation-media" ON storage.objects;