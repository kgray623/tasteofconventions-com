-- 1) Database-level backstop: refuse any write that lowers or removes a cuisine
--    quantity unless the request explicitly authorized that removal.
CREATE OR REPLACE FUNCTION public.guard_meal_reduction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  old_item jsonb;
  old_cuisine text;
  old_qty int;
  new_qty int;
BEGIN
  IF current_setting('app.meal_reduction_authorized', true) = 'yes' THEN
    RETURN NEW;
  END IF;

  FOR old_item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.selections, '[]'::jsonb))
  LOOP
    old_cuisine := old_item->>'cuisine';
    old_qty := COALESCE((old_item->>'qty')::int, 0);
    IF old_qty <= 0 OR old_cuisine IS NULL THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(COALESCE((n->>'qty')::int, 0)), 0) INTO new_qty
    FROM jsonb_array_elements(COALESCE(NEW.selections, '[]'::jsonb)) n
    WHERE n->>'cuisine' = old_cuisine;

    IF new_qty < old_qty THEN
      RAISE EXCEPTION 'MEAL_REDUCTION_NOT_CONFIRMED: % meals cannot be reduced or removed without a confirmed removal', old_cuisine
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_meal_reduction ON public.cuisine_preorders;
CREATE TRIGGER aaa_guard_meal_reduction
BEFORE UPDATE ON public.cuisine_preorders
FOR EACH ROW EXECUTE FUNCTION public.guard_meal_reduction();

-- 2) Single merge-safe writer. Cuisines not present in _submitted are never
--    touched. Reductions/removals require explicit confirmation in strict mode
--    and are ignored in additive mode.
CREATE OR REPLACE FUNCTION public.save_meal_order(
  _invitation_id uuid,
  _name text,
  _phone text,
  _submitted jsonb,
  _confirmed_removals text[] DEFAULT '{}'::text[],
  _mode text DEFAULT 'strict'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  existing jsonb := '[]'::jsonb;
  merged jsonb;
  item jsonb;
  cuisine text;
  qty int;
  old_qty int;
  has_reduction boolean := false;
  merged_map jsonb := '{}'::jsonb;
  k text;
BEGIN
  IF _mode NOT IN ('strict', 'additive') THEN
    RAISE EXCEPTION 'INVALID_MODE: %', _mode USING ERRCODE = '22023';
  END IF;

  SELECT p.id, COALESCE(p.selections, '[]'::jsonb)
    INTO existing_id, existing
  FROM public.cuisine_preorders p
  WHERE p.invitation_id = _invitation_id
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- start from everything already on record
  FOR item IN SELECT * FROM jsonb_array_elements(existing)
  LOOP
    cuisine := item->>'cuisine';
    qty := COALESCE((item->>'qty')::int, 0);
    IF cuisine IS NOT NULL AND qty > 0 THEN
      merged_map := merged_map || jsonb_build_object(cuisine, qty);
    END IF;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_submitted, '[]'::jsonb))
  LOOP
    cuisine := btrim(COALESCE(item->>'cuisine', ''));
    qty := GREATEST(0, COALESCE((item->>'qty')::int, 0));
    CONTINUE WHEN cuisine = '';
    old_qty := COALESCE((merged_map->>cuisine)::int, 0);

    IF qty >= old_qty THEN
      merged_map := merged_map || jsonb_build_object(cuisine, qty);
    ELSE
      IF _mode = 'additive' THEN
        -- never silently lose a meal on an additive save
        CONTINUE;
      END IF;
      IF NOT (cuisine = ANY(COALESCE(_confirmed_removals, '{}'::text[]))) THEN
        RAISE EXCEPTION 'MEAL_REMOVAL_NOT_CONFIRMED: %', cuisine USING ERRCODE = '22023';
      END IF;
      has_reduction := true;
      merged_map := merged_map || jsonb_build_object(cuisine, qty);
    END IF;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('cuisine', key, 'qty', (value #>> '{}')::int) ORDER BY key),
    '[]'::jsonb
  ) INTO merged
  FROM jsonb_each(merged_map)
  WHERE (value #>> '{}')::int > 0;

  IF has_reduction THEN
    PERFORM set_config('app.meal_reduction_authorized', 'yes', true);
  END IF;

  IF existing_id IS NULL THEN
    INSERT INTO public.cuisine_preorders (invitation_id, name, phone, selections)
    VALUES (_invitation_id, left(COALESCE(NULLIF(_name, ''), '—'), 120), left(COALESCE(NULLIF(_phone, ''), '—'), 40), merged);
  ELSE
    UPDATE public.cuisine_preorders
    SET name = COALESCE(NULLIF(_name, ''), name),
        phone = COALESCE(NULLIF(_phone, ''), phone),
        selections = merged,
        updated_at = now()
    WHERE id = existing_id;
  END IF;

  PERFORM set_config('app.meal_reduction_authorized', 'no', true);

  RETURN merged;
END;
$$;

REVOKE ALL ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) TO service_role;