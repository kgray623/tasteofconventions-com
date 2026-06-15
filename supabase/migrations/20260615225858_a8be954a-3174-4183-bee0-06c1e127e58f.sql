
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
  inviter_match boolean;
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

  -- Phone digits for this user (used by 2 and 3)
  SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')
    INTO my_digits
    FROM auth.users WHERE id = auth.uid();

  -- 2) Pending team_invites for this user's phone (retroactive)
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

  -- 3) Active entry in inviters (subcommittee/committee list) by phone
  IF my_digits IS NOT NULL AND length(my_digits) >= 7 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.inviters i
      WHERE i.active = true
        AND nullif(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), '') IS NOT NULL
        AND (
          regexp_replace(coalesce(i.phone, ''), '\D', '', 'g') = my_digits
          OR right(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), 10) = right(my_digits, 10)
        )
    ) INTO inviter_match;
    IF inviter_match THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (auth.uid(), 'team')
      ON CONFLICT DO NOTHING;
      granted := true;
    END IF;
  END IF;

  RETURN granted;
END;
$function$;

-- Backfill: grant 'team' role to every existing auth user whose phone matches an active inviter
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT u.id, 'team'::public.app_role
FROM public.inviters i
JOIN auth.users u
  ON nullif(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), '') IS NOT NULL
 AND nullif(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), '') IS NOT NULL
 AND (
   regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(i.phone, ''), '\D', '', 'g')
   OR right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(i.phone, ''), '\D', '', 'g'), 10)
 )
WHERE i.active = true
ON CONFLICT DO NOTHING;
