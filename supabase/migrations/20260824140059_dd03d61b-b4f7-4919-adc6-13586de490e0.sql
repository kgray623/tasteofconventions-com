GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_waiting_list TO authenticated;
GRANT ALL ON public.meal_waiting_list TO service_role;

ALTER TABLE public.meal_waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and team can view waiting list"
ON public.meal_waiting_list
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'));

CREATE POLICY "Admins and team can update waiting list"
ON public.meal_waiting_list
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'));

CREATE POLICY "Admins can delete waiting list rows"
ON public.meal_waiting_list
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));