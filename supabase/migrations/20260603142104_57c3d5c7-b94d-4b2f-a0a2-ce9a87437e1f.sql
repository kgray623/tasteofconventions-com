CREATE POLICY "team manages rsvps"
ON public.rsvps
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'team'::app_role))
WITH CHECK (has_role(auth.uid(), 'team'::app_role));