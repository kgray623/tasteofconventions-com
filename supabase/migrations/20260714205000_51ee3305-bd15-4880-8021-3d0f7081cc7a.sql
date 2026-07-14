
-- 1) Add inviter_id link on invitations (nullable, safe)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS inviter_id uuid REFERENCES public.inviters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invitations_inviter_id_idx ON public.invitations(inviter_id);

-- 2) Ensure Tina Santana exists in inviters (name is UNIQUE)
INSERT INTO public.inviters (name, quota, active)
VALUES ('Tina Santana', 25, true)
ON CONFLICT (name) DO UPDATE SET quota = GREATEST(public.inviters.quota, EXCLUDED.quota), active = true;

-- 3) Backfill the two upload batches: Jul 14 20:42 UTC (4 rows) and Jul 11 21:50 UTC (21 rows)
UPDATE public.invitations
SET inviter_id = (SELECT id FROM public.inviters WHERE name = 'Tina Santana' LIMIT 1)
WHERE host_id = '00651c0f-c5e3-45b1-8979-960f3f752c74'
  AND (
    (created_at >= '2026-07-14 20:42:00+00' AND created_at < '2026-07-14 20:43:00+00')
    OR
    (created_at >= '2026-07-11 21:50:00+00' AND created_at < '2026-07-11 21:51:00+00')
  );
