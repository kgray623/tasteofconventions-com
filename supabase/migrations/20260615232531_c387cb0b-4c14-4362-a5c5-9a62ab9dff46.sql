CREATE POLICY "category members can read category_messages realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'category_messages:%'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.category_assignments ca
      WHERE ca.user_id = auth.uid()
        AND ca.category_id::text = split_part(realtime.topic(), ':', 2)
    )
  )
);