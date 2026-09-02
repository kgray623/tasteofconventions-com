CREATE OR REPLACE FUNCTION public.set_album_engagement_profile_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name text;
BEGIN
  SELECT NULLIF(btrim(p.display_name), '')
    INTO profile_name
    FROM public.profiles AS p
   WHERE p.id = NEW.user_id;

  IF TG_TABLE_NAME = 'photo_comments' THEN
    NEW.commenter_name := COALESCE(profile_name, 'Guest');
  ELSIF TG_TABLE_NAME = 'photo_likes' THEN
    NEW.liker_name := COALESCE(profile_name, 'Guest');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS photo_comments_set_profile_name ON public.photo_comments;
CREATE TRIGGER photo_comments_set_profile_name
BEFORE INSERT OR UPDATE OF user_id, commenter_name ON public.photo_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_album_engagement_profile_name();

DROP TRIGGER IF EXISTS photo_likes_set_profile_name ON public.photo_likes;
CREATE TRIGGER photo_likes_set_profile_name
BEFORE INSERT OR UPDATE OF user_id, liker_name ON public.photo_likes
FOR EACH ROW
EXECUTE FUNCTION public.set_album_engagement_profile_name();