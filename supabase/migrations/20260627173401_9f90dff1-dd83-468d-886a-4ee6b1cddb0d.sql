-- Admin-only SELECT and INSERT policies on admin-exports bucket
CREATE POLICY "Admins can read admin-exports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'admin-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload admin-exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'admin-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin-exports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'admin-exports' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'admin-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin-exports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'admin-exports' AND public.has_role(auth.uid(), 'admin'));