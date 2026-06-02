INSERT INTO storage.buckets (id, name, public) VALUES ('invitation-media', 'invitation-media', true) ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read invitation-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'invitation-media');