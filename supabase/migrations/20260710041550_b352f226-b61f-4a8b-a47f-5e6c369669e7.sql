DROP POLICY IF EXISTS "anyone can submit cuisine preorder" ON public.cuisine_preorders;

CREATE OR REPLACE FUNCTION public.link_preorder_by_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  digits text;
  match_id uuid;
  existing_id uuid;
BEGIN
  IF NEW.invitation_id IS NULL THEN
    digits := nullif(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), '');
    IF digits IS NOT NULL AND length(digits) >= 7 THEN
      SELECT i.id INTO match_id
      FROM public.invitations i
      WHERE i.guest_phone_normalized IS NOT NULL
        AND length(i.guest_phone_normalized) >= 7
        AND right(i.guest_phone_normalized, 10) = right(digits, 10)
      ORDER BY i.created_at ASC
      LIMIT 1;

      IF match_id IS NOT NULL THEN
        NEW.invitation_id := match_id;
      END IF;
    END IF;
  END IF;

  IF NEW.invitation_id IS NULL THEN
    RAISE EXCEPTION 'PREORDER_REQUIRES_INVITATION: Meal choices must match an invited RSVP phone number.'
      USING ERRCODE = '23514';
  END IF;

  SELECT p.id INTO existing_id
  FROM public.cuisine_preorders p
  WHERE p.invitation_id = NEW.invitation_id
    AND (TG_OP = 'INSERT' OR p.id <> NEW.id)
  ORDER BY p.updated_at DESC, p.created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.cuisine_preorders p
    SET
      name = COALESCE(NULLIF(p.name, ''), NEW.name),
      phone = COALESCE(NULLIF(p.phone, ''), NEW.phone),
      selections = public.merge_preorder_selections(p.selections, NEW.selections),
      updated_at = now()
    WHERE p.id = existing_id;

    UPDATE public.rsvps r
    SET ordering_food = true
    WHERE r.invitation_id = NEW.invitation_id
      AND r.status = 'yes'::public.rsvp_status;

    RETURN NULL;
  END IF;

  NEW.selections := public.merge_preorder_selections('[]'::jsonb, NEW.selections);

  UPDATE public.rsvps r
  SET ordering_food = true
  WHERE r.invitation_id = NEW.invitation_id
    AND r.status = 'yes'::public.rsvp_status;

  RETURN NEW;
END;
$$;