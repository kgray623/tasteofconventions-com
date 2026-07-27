ALTER TABLE public.chat_last_seen DROP CONSTRAINT IF EXISTS chat_last_seen_chat_kind_check;
ALTER TABLE public.chat_last_seen ADD CONSTRAINT chat_last_seen_chat_kind_check
  CHECK (chat_kind = ANY (ARRAY['team'::text, 'category'::text, 'guest'::text, 'rsvp'::text]));