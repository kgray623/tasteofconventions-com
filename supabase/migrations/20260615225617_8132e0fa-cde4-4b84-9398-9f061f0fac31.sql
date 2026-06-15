
CREATE OR REPLACE FUNCTION public.ensure_committee_team_role()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_comm boolean;
  my_digits text;
  inv public.team_invites%ROWTYPE;
  granted boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  -- 1) Committee membership via invitations.is_committee
  SELECT public.is_current_user_committee() INTO is_comm;
  IF is_comm THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'team')
    ON CONFLICT DO NOTHING;
    granted := true;
  END IF;

  -- 2) Apply any pending team_invites for this user's phone (retroactive)
  SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')
    INTO my_digits
    FROM auth.users WHERE id = auth.uid();

  IF my_digits IS NOT NULL AND length(my_digits) >= 7 THEN
    FOR inv IN
      SELECT * FROM public.team_invites
       WHERE accepted_at IS NULL
         AND (phone_normalized = my_digits
              OR right(coalesce(phone_normalized, ''), 10) = right(my_digits, 10))
    LOOP
      INSERT INTO public.user_roles (user_id, role)
      VALUES (auth.uid(), inv.role)
      ON CONFLICT DO NOTHING;
      UPDATE public.team_invites SET accepted_at = now() WHERE id = inv.id;
      granted := true;
    END LOOP;
  END IF;

  RETURN granted;
END;
$function$;

-- Backfill Tiana Stoddard and anyone else with a pending team_invite whose phone matches an existing auth user
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, ti.role
FROM public.team_invites ti
JOIN auth.users u
  ON nullif(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), '') IS NOT NULL
 AND (
   regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = ti.phone_normalized
   OR right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10) = right(coalesce(ti.phone_normalized, ''), 10)
 )
WHERE ti.accepted_at IS NULL
  AND ti.phone_normalized IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.team_invites ti
SET accepted_at = now()
WHERE accepted_at IS NULL
  AND ti.phone_normalized IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE nullif(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), '') IS NOT NULL
      AND (
        regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = ti.phone_normalized
        OR right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10) = right(ti.phone_normalized, 10)
      )
  );
