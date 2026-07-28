-- Backfill: point each inviter row at the account belonging to that person.
UPDATE public.inviters i
SET host_id = u.id
FROM auth.users u
WHERE nullif(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), '') IS NOT NULL
  AND length(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g')) >= 10
  AND right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), 10)
  AND i.host_id IS DISTINCT FROM u.id;

-- Fall back to the committee invitation phone when the roster row has no phone.
UPDATE public.inviters i
SET host_id = u.id
FROM public.invitations inv
JOIN auth.users u
  ON right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10)
   = right(coalesce(inv.guest_phone_normalized, ''), 10)
WHERE nullif(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), '') IS NULL
  AND inv.is_committee = true
  AND length(coalesce(inv.guest_phone_normalized, '')) >= 10
  AND public.normalize_name_for_match(inv.guest_name) = public.normalize_name_for_match(i.name)
  AND i.host_id IS DISTINCT FROM u.id;

-- Forward fix: link new/updated roster rows to the matching account automatically.
CREATE OR REPLACE FUNCTION public.link_inviter_host_from_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  digits text;
  match_id uuid;
BEGIN
  digits := nullif(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), '');
  IF digits IS NULL OR length(digits) < 10 THEN
    RETURN NEW;
  END IF;

  SELECT u.id INTO match_id
  FROM auth.users u
  WHERE right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10) = right(digits, 10)
  ORDER BY u.created_at ASC
  LIMIT 1;

  IF match_id IS NOT NULL THEN
    NEW.host_id := match_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_link_inviter_host_from_phone ON public.inviters;
CREATE TRIGGER trg_link_inviter_host_from_phone
BEFORE INSERT OR UPDATE OF phone ON public.inviters
FOR EACH ROW EXECUTE FUNCTION public.link_inviter_host_from_phone();