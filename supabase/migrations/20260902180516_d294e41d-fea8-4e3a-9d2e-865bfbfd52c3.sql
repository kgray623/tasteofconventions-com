DROP TRIGGER IF EXISTS trg_enforce_commenter_name ON public.photo_comments;
DROP TRIGGER IF EXISTS trg_enforce_liker_name ON public.photo_likes;
DROP FUNCTION IF EXISTS public.enforce_album_poster_name();