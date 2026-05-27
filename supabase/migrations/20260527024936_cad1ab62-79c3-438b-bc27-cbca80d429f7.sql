INSERT INTO public.user_roles (user_id, role) VALUES
  ('00651c0f-c5e3-45b1-8979-960f3f752c74', 'admin'),
  ('00651c0f-c5e3-45b1-8979-960f3f752c74', 'team'),
  ('00651c0f-c5e3-45b1-8979-960f3f752c74', 'host')
ON CONFLICT DO NOTHING;