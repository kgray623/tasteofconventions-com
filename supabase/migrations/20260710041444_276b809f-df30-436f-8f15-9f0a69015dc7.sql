CREATE OR REPLACE FUNCTION public.normalize_preorder_selection(_item jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _item IS NULL OR jsonb_typeof(_item) <> 'object' THEN NULL
    WHEN GREATEST(0, COALESCE(round(NULLIF(_item->>'qty', '')::numeric)::int, 0)) <= 0 THEN NULL
    ELSE jsonb_build_object(
      'cuisine', CASE
        WHEN lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%burmese%'
          OR lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%myanmar%'
          THEN 'Myanmar'
        WHEN lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%african%'
          OR lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%africa%'
          OR lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%mozambique%'
          THEN 'African'
        WHEN lower(COALESCE(_item->>'cuisine', _item->>'country', '')) LIKE '%indonesia%'
          THEN 'Indonesian'
        ELSE btrim(COALESCE(_item->>'cuisine', _item->>'country', ''))
      END,
      'qty', GREATEST(0, COALESCE(round(NULLIF(_item->>'qty', '')::numeric)::int, 0))
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.merge_preorder_selections(_existing jsonb, _incoming jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  WITH normalized AS (
    SELECT public.normalize_preorder_selection(value) AS item
    FROM jsonb_array_elements(COALESCE(_existing, '[]'::jsonb))
    UNION ALL
    SELECT public.normalize_preorder_selection(value) AS item
    FROM jsonb_array_elements(COALESCE(_incoming, '[]'::jsonb))
  ), clean AS (
    SELECT item->>'cuisine' AS cuisine, (item->>'qty')::int AS qty
    FROM normalized
    WHERE item IS NOT NULL
      AND COALESCE(item->>'cuisine', '') <> ''
      AND (item->>'qty')::int > 0
  ), summed AS (
    SELECT cuisine, sum(qty)::int AS qty
    FROM clean
    GROUP BY cuisine
  )
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('cuisine', cuisine, 'qty', qty) ORDER BY cuisine),
    '[]'::jsonb
  )
  FROM summed;
$$;

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
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_link_preorder_by_phone ON public.cuisine_preorders;
CREATE TRIGGER trg_link_preorder_by_phone
BEFORE INSERT OR UPDATE OF phone, invitation_id, selections ON public.cuisine_preorders
FOR EACH ROW EXECUTE FUNCTION public.link_preorder_by_phone();