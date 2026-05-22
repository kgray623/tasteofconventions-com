-- Lock down writes on orders and rsvps to admins only via the anon/authenticated
-- API. Server functions use the service-role client which bypasses RLS, so the
-- legitimate app paths (public RSVP, guest order submission via server fn) keep
-- working. This blocks any direct write attempts from authenticated clients.

CREATE POLICY "admins manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage rsvps" ON public.rsvps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
