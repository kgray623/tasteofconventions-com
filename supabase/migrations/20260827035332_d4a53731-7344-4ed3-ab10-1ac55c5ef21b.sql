CREATE TABLE public.shared_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  guest_name text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.shared_photos TO authenticated;
GRANT ALL ON public.shared_photos TO service_role;

ALTER TABLE public.shared_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users can view shared photos"
  ON public.shared_photos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed in users can add shared photos"
  ON public.shared_photos FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX shared_photos_created_at_idx ON public.shared_photos (created_at DESC);

CREATE POLICY "Signed in users can upload guest photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guest-photos');

CREATE POLICY "Signed in users can read guest photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guest-photos');