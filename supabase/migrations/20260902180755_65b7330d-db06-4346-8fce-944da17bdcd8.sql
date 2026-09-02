DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'photo_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_comments;
  END IF;
END
$$;