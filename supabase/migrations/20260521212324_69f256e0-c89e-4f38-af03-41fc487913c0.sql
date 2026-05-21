DROP POLICY IF EXISTS "public can only create guest-originated messages" ON public.guest_messages;
DROP POLICY IF EXISTS "public insert guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "anon reads guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "public read guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "host or admin reads guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "admins or hosts read guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "admins or hosts create host replies" ON public.guest_messages;
DROP POLICY IF EXISTS "admins or hosts update read flags" ON public.guest_messages;