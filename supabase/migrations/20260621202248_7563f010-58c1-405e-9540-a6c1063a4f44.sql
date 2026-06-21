
-- 1) chat_last_seen: stop broadcasting to realtime (no client subscribes)
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_last_seen;

-- 2) entertainment-videos: allow admin/team to update + delete
CREATE POLICY "admin or team update entertainment video"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'entertainment-videos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)))
WITH CHECK (bucket_id = 'entertainment-videos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)));

CREATE POLICY "admin or team delete entertainment video"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'entertainment-videos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)));

-- 3) invitation-media: lock down writes to admin/team; allow public read (bucket is public)
CREATE POLICY "public read invitation media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'invitation-media');

CREATE POLICY "admin or team insert invitation media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invitation-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)));

CREATE POLICY "admin or team update invitation media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invitation-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)))
WITH CHECK (bucket_id = 'invitation-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)));

CREATE POLICY "admin or team delete invitation media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invitation-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'team'::app_role)));
