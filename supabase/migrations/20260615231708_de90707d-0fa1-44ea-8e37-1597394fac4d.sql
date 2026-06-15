CREATE TABLE public.chat_last_seen (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_kind text NOT NULL CHECK (chat_kind IN ('team','category','guest')),
  chat_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_kind, chat_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_last_seen TO authenticated;
GRANT ALL ON public.chat_last_seen TO service_role;

ALTER TABLE public.chat_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own last seen"
ON public.chat_last_seen
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_last_seen;

CREATE OR REPLACE FUNCTION public.get_my_chat_unread()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  team_sentinel uuid := '00000000-0000-0000-0000-000000000001';
  team_count int := 0;
  cats jsonb := '[]'::jsonb;
  is_team_member boolean;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('team', 0, 'categories', '[]'::jsonb, 'total', 0);
  END IF;

  is_team_member := has_role(me, 'team'::app_role) OR has_role(me, 'admin'::app_role);

  IF is_team_member THEN
    SELECT count(*) INTO team_count
    FROM team_messages tm
    LEFT JOIN chat_last_seen ls
      ON ls.user_id = me AND ls.chat_kind = 'team' AND ls.chat_id = team_sentinel
    WHERE tm.user_id <> me
      AND tm.created_at > COALESCE(ls.last_seen_at, 'epoch'::timestamptz);
  END IF;

  WITH sub AS (
    SELECT cm.category_id, count(*) AS cnt
    FROM category_messages cm
    JOIN category_assignments ca
      ON ca.category_id = cm.category_id AND ca.user_id = me
    LEFT JOIN chat_last_seen ls
      ON ls.user_id = me AND ls.chat_kind = 'category' AND ls.chat_id = cm.category_id
    WHERE cm.user_id <> me
      AND cm.created_at > COALESCE(ls.last_seen_at, 'epoch'::timestamptz)
    GROUP BY cm.category_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category_id', c.id,
    'name', c.name,
    'count', sub.cnt
  ) ORDER BY c.name), '[]'::jsonb) INTO cats
  FROM sub
  JOIN categories c ON c.id = sub.category_id;

  RETURN jsonb_build_object(
    'team', team_count,
    'categories', cats,
    'total', team_count + COALESCE(
      (SELECT sum((e->>'count')::int) FROM jsonb_array_elements(cats) e), 0
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_chat_unread() TO authenticated;