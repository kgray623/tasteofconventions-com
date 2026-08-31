CREATE POLICY "Uploaders can read their own guest photo files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'guest-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);