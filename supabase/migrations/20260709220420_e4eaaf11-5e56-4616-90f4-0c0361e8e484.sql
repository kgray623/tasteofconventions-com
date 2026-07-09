-- Forward-fix: trigger to auto-link cuisine_preorders to an invitation by phone.
-- If the matched invitation already has a preorder, we leave invitation_id null
-- (so the unique constraint doesn't blow up on insert) — those still appear in
-- the "needs review" list for a human to reconcile.
CREATE OR REPLACE FUNCTION public.link_preorder_by_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  digits text;
  match_id uuid;
  taken boolean;
BEGIN
  IF NEW.invitation_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  digits := nullif(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), '');
  IF digits IS NULL OR length(digits) < 7 THEN
    RETURN NEW;
  END IF;

  SELECT i.id INTO match_id
  FROM public.invitations i
  WHERE i.guest_phone_normalized IS NOT NULL
    AND length(i.guest_phone_normalized) >= 7
    AND right(i.guest_phone_normalized, 10) = right(digits, 10)
  ORDER BY i.created_at ASC
  LIMIT 1;

  IF match_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cuisine_preorders p
    WHERE p.invitation_id = match_id
      AND (TG_OP = 'INSERT' OR p.id <> NEW.id)
  ) INTO taken;

  IF NOT taken THEN
    NEW.invitation_id := match_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_preorder_by_phone ON public.cuisine_preorders;
CREATE TRIGGER trg_link_preorder_by_phone
BEFORE INSERT OR UPDATE OF phone, invitation_id ON public.cuisine_preorders
FOR EACH ROW
EXECUTE FUNCTION public.link_preorder_by_phone();

-- Backfill part A: delete unlinked preorders that duplicate an already-linked
-- preorder for the same invitation (same person submitted from /preorder AND
-- via their invitation — keep the linked, newer one).
DELETE FROM public.cuisine_preorders cp
USING public.invitations i, public.cuisine_preorders linked
WHERE cp.invitation_id IS NULL
  AND cp.phone IS NOT NULL
  AND i.guest_phone_normalized IS NOT NULL
  AND length(i.guest_phone_normalized) >= 7
  AND length(regexp_replace(cp.phone, '\D', '', 'g')) >= 7
  AND right(i.guest_phone_normalized, 10) = right(regexp_replace(cp.phone, '\D', '', 'g'), 10)
  AND linked.invitation_id = i.id;

-- Backfill part B: link any remaining unlinked rows whose invitation has no
-- preorder yet.
UPDATE public.cuisine_preorders cp
SET invitation_id = i.id
FROM public.invitations i
WHERE cp.invitation_id IS NULL
  AND cp.phone IS NOT NULL
  AND i.guest_phone_normalized IS NOT NULL
  AND length(i.guest_phone_normalized) >= 7
  AND length(regexp_replace(cp.phone, '\D', '', 'g')) >= 7
  AND right(i.guest_phone_normalized, 10) = right(regexp_replace(cp.phone, '\D', '', 'g'), 10)
  AND NOT EXISTS (
    SELECT 1 FROM public.cuisine_preorders other
    WHERE other.invitation_id = i.id
  );
