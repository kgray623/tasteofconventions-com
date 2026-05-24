DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'apply_team_invite_on_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER apply_team_invite_on_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.apply_team_invite();
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, ti.role
FROM auth.users u
JOIN public.team_invites ti ON ti.email_normalized = lower(u.email)
WHERE ti.accepted_at IS NULL
ON CONFLICT DO NOTHING;

UPDATE public.team_invites ti
SET accepted_at = now()
FROM auth.users u
WHERE ti.email_normalized = lower(u.email)
  AND ti.accepted_at IS NULL;