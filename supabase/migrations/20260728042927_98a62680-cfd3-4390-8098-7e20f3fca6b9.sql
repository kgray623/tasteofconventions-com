-- Storage: entertainment-videos
DROP POLICY IF EXISTS "admin or team reads entertainment video" ON storage.objects;
CREATE POLICY "admin or team reads entertainment video" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'entertainment-videos' AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role)));

DROP POLICY IF EXISTS "admin or team update entertainment video" ON storage.objects;
CREATE POLICY "admin or team update entertainment video" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'entertainment-videos' AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role)))
WITH CHECK (bucket_id = 'entertainment-videos' AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role)));

DROP POLICY IF EXISTS "admin or team delete entertainment video" ON storage.objects;
CREATE POLICY "admin or team delete entertainment video" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'entertainment-videos' AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role)));

-- Storage: admin-exports
DROP POLICY IF EXISTS "Admins can read admin-exports" ON storage.objects;
CREATE POLICY "Admins can read admin-exports" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'admin-exports' AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can upload admin-exports" ON storage.objects;
CREATE POLICY "Admins can upload admin-exports" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'admin-exports' AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update admin-exports" ON storage.objects;
CREATE POLICY "Admins can update admin-exports" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'admin-exports' AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'admin-exports' AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete admin-exports" ON storage.objects;
CREATE POLICY "Admins can delete admin-exports" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'admin-exports' AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime message policies
DROP POLICY IF EXISTS "team can read team_messages realtime" ON realtime.messages;
CREATE POLICY "team can read team_messages realtime" ON realtime.messages
FOR SELECT TO authenticated
USING (realtime.topic() = 'team_messages' AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role)));

DROP POLICY IF EXISTS "category members can read category_messages realtime" ON realtime.messages;
CREATE POLICY "category members can read category_messages realtime" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'category_messages:%'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'team'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.category_assignments ca
      WHERE ca.user_id = auth.uid()
        AND ca.category_id::text = split_part(realtime.topic(), ':', 2)
    )
  )
);