
-- 1) Drop the duplicate audit triggers (keep one per table)
DROP TRIGGER IF EXISTS trg_audit_invitations_change ON public.invitations;
DROP TRIGGER IF EXISTS trg_audit_rsvps_change ON public.rsvps;
DROP TRIGGER IF EXISTS trg_audit_team_invites_change ON public.team_invites;
DROP TRIGGER IF EXISTS trg_audit_inviters_change ON public.inviters;
DROP TRIGGER IF EXISTS trg_audit_cuisine_preorders_change ON public.cuisine_preorders;

-- 2) Fuzzy-match helper for the guest list and quick-add screen.
-- Returns invitations whose name or phone/email matches the query with trigram
-- similarity >= threshold. Admin/team only.
CREATE OR REPLACE FUNCTION public.search_invitations_fuzzy(
  _event_id uuid,
  _query text,
  _threshold real DEFAULT 0.5
)
RETURNS TABLE(
  id uuid,
  guest_name text,
  guest_phone text,
  guest_email text,
  is_committee boolean,
  similarity real,
  match_kind text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      public.normalize_name_for_match(_query) AS name_q,
      regexp_replace(coalesce(_query, ''), '\D', '', 'g') AS phone_q,
      lower(btrim(coalesce(_query, ''))) AS email_q
  )
  SELECT
    i.id, i.guest_name, i.guest_phone, i.guest_email, i.is_committee,
    GREATEST(
      CASE WHEN length((SELECT name_q FROM q)) >= 2
           THEN public.similarity(public.normalize_name_for_match(i.guest_name), (SELECT name_q FROM q))
           ELSE 0 END,
      CASE WHEN length((SELECT phone_q FROM q)) >= 4
                AND i.guest_phone_normalized IS NOT NULL
                AND (i.guest_phone_normalized = (SELECT phone_q FROM q)
                     OR right(i.guest_phone_normalized, 10) = right((SELECT phone_q FROM q), 10))
           THEN 1.0 ELSE 0 END,
      CASE WHEN length((SELECT email_q FROM q)) >= 3
                AND i.guest_email_normalized IS NOT NULL
                AND i.guest_email_normalized LIKE '%' || (SELECT email_q FROM q) || '%'
           THEN 0.9 ELSE 0 END
    ) AS similarity,
    CASE
      WHEN length((SELECT phone_q FROM q)) >= 4
           AND i.guest_phone_normalized IS NOT NULL
           AND (i.guest_phone_normalized = (SELECT phone_q FROM q)
                OR right(i.guest_phone_normalized, 10) = right((SELECT phone_q FROM q), 10))
        THEN 'phone'
      WHEN length((SELECT email_q FROM q)) >= 3
           AND i.guest_email_normalized IS NOT NULL
           AND i.guest_email_normalized LIKE '%' || (SELECT email_q FROM q) || '%'
        THEN 'email'
      ELSE 'name'
    END AS match_kind
  FROM public.invitations i
  WHERE i.event_id = _event_id
    AND (
      (length((SELECT name_q FROM q)) >= 2
        AND public.similarity(public.normalize_name_for_match(i.guest_name), (SELECT name_q FROM q)) >= _threshold)
      OR (length((SELECT phone_q FROM q)) >= 4
        AND i.guest_phone_normalized IS NOT NULL
        AND (i.guest_phone_normalized = (SELECT phone_q FROM q)
             OR right(i.guest_phone_normalized, 10) = right((SELECT phone_q FROM q), 10)))
      OR (length((SELECT email_q FROM q)) >= 3
        AND i.guest_email_normalized IS NOT NULL
        AND i.guest_email_normalized LIKE '%' || (SELECT email_q FROM q) || '%')
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'team'::public.app_role)
    )
  ORDER BY similarity DESC, guest_name
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_invitations_fuzzy(uuid, text, real) TO authenticated;

-- 3) Block future duplicate guests by phone or email (per event).
-- Uses a trigger (not a unique index) so existing duplicate rows are preserved.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_name text;
  v_existing_id uuid;
BEGIN
  -- Phone match (last 10 digits) within the same event
  IF NEW.guest_phone_normalized IS NOT NULL AND length(NEW.guest_phone_normalized) >= 7 THEN
    SELECT i.id, i.guest_name INTO v_existing_id, v_existing_name
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id
      AND i.id <> NEW.id
      AND i.guest_phone_normalized IS NOT NULL
      AND length(i.guest_phone_normalized) >= 7
      AND right(i.guest_phone_normalized, 10) = right(NEW.guest_phone_normalized, 10)
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'DUPLICATE_GUEST_PHONE: % is already on the guest list (matches %)',
        NEW.guest_name, v_existing_name
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Email exact match within the same event
  IF NEW.guest_email_normalized IS NOT NULL AND NEW.guest_email_normalized <> '' THEN
    SELECT i.id, i.guest_name INTO v_existing_id, v_existing_name
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id
      AND i.id <> NEW.id
      AND i.guest_email_normalized = NEW.guest_email_normalized
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

DROP TRIGGER IF EXISTS prevent_duplicate_invitation_trg ON public.invitations;
CREATE TRIGGER prevent_duplicate_invitation_trg
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_invitation();
