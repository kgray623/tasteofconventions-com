
DO $$
DECLARE
  keep_id uuid;
  drop_id uuid;
BEGIN
  SELECT id INTO keep_id FROM public.inviters WHERE name = 'Myisha Woods' LIMIT 1;
  SELECT id INTO drop_id FROM public.inviters WHERE name = 'Mysha Woods' LIMIT 1;
  IF keep_id IS NOT NULL AND drop_id IS NOT NULL THEN
    UPDATE public.invitations SET inviter_id = keep_id WHERE inviter_id = drop_id;
    DELETE FROM public.inviters WHERE id = drop_id;
  END IF;
END $$;

UPDATE public.invitations inv
SET inviter_id = iv.id
FROM (
  SELECT host_id, (array_agg(id ORDER BY created_at))[1] AS id
  FROM public.inviters
  WHERE host_id IS NOT NULL
  GROUP BY host_id
  HAVING count(*) = 1
) iv
WHERE inv.inviter_id IS NULL
  AND inv.host_id = iv.host_id;

CREATE OR REPLACE FUNCTION public.auto_link_invitation_inviter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_id uuid;
  match_count int;
BEGIN
  IF NEW.inviter_id IS NULL AND NEW.host_id IS NOT NULL THEN
    SELECT count(*), (array_agg(id ORDER BY created_at))[1]
      INTO match_count, match_id
    FROM public.inviters
    WHERE host_id = NEW.host_id;
    IF match_count = 1 THEN
      NEW.inviter_id := match_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_invitation_inviter ON public.invitations;
CREATE TRIGGER trg_auto_link_invitation_inviter
BEFORE INSERT OR UPDATE OF host_id, inviter_id ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.auto_link_invitation_inviter();
