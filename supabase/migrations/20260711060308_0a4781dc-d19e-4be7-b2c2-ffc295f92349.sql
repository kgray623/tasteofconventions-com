
CREATE OR REPLACE FUNCTION public.link_preorder_by_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  digits text;
  match_id uuid;
  existing_id uuid;
  normalized_selections jsonb;
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

  -- Normalize/dedupe incoming selections without summing with anything prior.
  normalized_selections := public.merge_preorder_selections('[]'::jsonb, NEW.selections);

  SELECT p.id INTO existing_id
  FROM public.cuisine_preorders p
  WHERE p.invitation_id = NEW.invitation_id
    AND (TG_OP = 'INSERT' OR p.id <> NEW.id)
  ORDER BY p.updated_at DESC, p.created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.cuisine_preorders p
    SET
      name = COALESCE(NULLIF(NEW.name, ''), p.name),
      phone = COALESCE(NULLIF(NEW.phone, ''), p.phone),
      selections = normalized_selections,
      updated_at = now()
    WHERE p.id = existing_id;

    UPDATE public.rsvps r
    SET ordering_food = true
    WHERE r.invitation_id = NEW.invitation_id
      AND r.status = 'yes'::public.rsvp_status;

    RETURN NULL;
  END IF;

  NEW.selections := normalized_selections;

  UPDATE public.rsvps r
  SET ordering_food = true
  WHERE r.invitation_id = NEW.invitation_id
    AND r.status = 'yes'::public.rsvp_status;

  RETURN NEW;
END;
$function$;
