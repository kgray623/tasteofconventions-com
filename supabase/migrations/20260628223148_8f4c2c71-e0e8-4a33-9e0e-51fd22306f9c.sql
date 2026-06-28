
CREATE OR REPLACE FUNCTION public.prevent_duplicate_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_email text;
  v_existing_name text;
BEGIN
  -- Generated columns are NULL inside BEFORE triggers; normalize inline.
  v_phone := nullif(regexp_replace(coalesce(NEW.guest_phone, ''), '\D', '', 'g'), '');
  v_email := nullif(lower(btrim(coalesce(NEW.guest_email, ''))), '');

  IF v_phone IS NOT NULL AND length(v_phone) >= 7 THEN
    SELECT i.guest_name INTO v_existing_name
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id
      AND i.id <> NEW.id
      AND i.guest_phone_normalized IS NOT NULL
      AND length(i.guest_phone_normalized) >= 7
      AND right(i.guest_phone_normalized, 10) = right(v_phone, 10)
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'DUPLICATE_GUEST_PHONE: % is already on the guest list (matches %)',
        NEW.guest_name, v_existing_name
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT i.guest_name INTO v_existing_name
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id
      AND i.id <> NEW.id
      AND i.guest_email_normalized = v_email
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'DUPLICATE_GUEST_EMAIL: % is already on the guest list (matches %)',
        NEW.guest_name, v_existing_name
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
