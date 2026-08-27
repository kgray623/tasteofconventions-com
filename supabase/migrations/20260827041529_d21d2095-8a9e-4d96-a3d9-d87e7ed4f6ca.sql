CREATE POLICY "Guests can delete their own shared photos"
ON public.shared_photos
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "Guests can delete their own guest photo files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'guest-photos' AND (storage.foldername(name))[1] = auth.uid()::text);