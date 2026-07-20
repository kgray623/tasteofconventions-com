CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Point every public-table access rule at the private role helper so role checks
-- remain available to RLS without exposing the helper as a public API function.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%has_role(%' OR with_check LIKE '%has_role(%')
  LOOP
    new_qual := replace(replace(pol.qual, 'public.has_role(', 'private.has_role('), 'has_role(', 'private.has_role(');
    new_check := replace(replace(pol.with_check, 'public.has_role(', 'private.has_role('), 'has_role(', 'private.has_role(');

    stmt := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- Recreate helper functions with private role checks where they still need
-- elevated access internally.
CREATE OR REPLACE FUNCTION public.search_invitations_fuzzy(_event_id uuid, _query text, _threshold real DEFAULT 0.5)
RETURNS TABLE(id uuid, guest_name text, guest_phone text, guest_email text, is_committee boolean, similarity real, match_kind text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
           THEN similarity(public.normalize_name_for_match(i.guest_name), (SELECT name_q FROM q))
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
        AND similarity(public.normalize_name_for_match(i.guest_name), (SELECT name_q FROM q)) >= _threshold)
      OR (length((SELECT phone_q FROM q)) >= 4
        AND i.guest_phone_normalized IS NOT NULL
        AND (i.guest_phone_normalized = (SELECT phone_q FROM q)
             OR right(i.guest_phone_normalized, 10) = right((SELECT phone_q FROM q), 10)))
      OR (length((SELECT email_q FROM q)) >= 3
        AND i.guest_email_normalized IS NOT NULL
        AND i.guest_email_normalized LIKE '%' || (SELECT email_q FROM q) || '%')
    )
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'team'::public.app_role)
    )
  ORDER BY similarity DESC, guest_name
  LIMIT 50;
$function$;

CREATE OR REPLACE FUNCTION public.detect_duplicate_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_phone_tail text;
  new_name_norm text;
BEGIN
  IF NEW.guest_email_normalized IS NOT NULL AND NEW.guest_email_normalized <> '' THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'email'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_email_normalized = NEW.guest_email_normalized
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.guest_phone_normalized IS NOT NULL AND length(NEW.guest_phone_normalized) >= 7 THEN
    new_phone_tail := right(NEW.guest_phone_normalized, 10);
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'phone'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND i.guest_phone_normalized IS NOT NULL
      AND length(i.guest_phone_normalized) >= 7
      AND right(i.guest_phone_normalized, 10) = new_phone_tail
    ON CONFLICT DO NOTHING;
  END IF;

  new_name_norm := public.normalize_name_for_match(NEW.guest_name);
  IF length(new_name_norm) >= 4 THEN
    INSERT INTO public.duplicate_flags (event_id, invitation_a, invitation_b, match_type)
    SELECT NEW.event_id, LEAST(NEW.id, i.id), GREATEST(NEW.id, i.id), 'name'
    FROM public.invitations i
    WHERE i.event_id = NEW.event_id AND i.id <> NEW.id
      AND length(public.normalize_name_for_match(i.guest_name)) >= 4
      AND similarity(public.normalize_name_for_match(i.guest_name), new_name_norm) >= 0.6
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

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

  SELECT public.is_current_user_committee() INTO is_comm;
  IF is_comm THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'team')
    ON CONFLICT DO NOTHING;
    granted := true;
  END IF;

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

CREATE OR REPLACE FUNCTION public.is_current_user_committee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') AS digits
    FROM auth.users WHERE id = auth.uid()
  )
  SELECT EXISTS (
    SELECT 1 FROM public.invitations i, me
    WHERE i.is_committee = true
      AND me.digits IS NOT NULL
      AND (
        i.guest_phone_normalized = me.digits
        OR right(coalesce(i.guest_phone_normalized, ''), 10) = right(me.digits, 10)
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_my_chat_unread()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  team_sentinel uuid := '00000000-0000-0000-0000-000000000001';
  team_count int := 0;
  cats jsonb := '[]'::jsonb;
  is_team_member boolean;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('team', 0, 'categories', '[]'::jsonb, 'total', 0);
  END IF;

  is_team_member := private.has_role(me, 'team'::public.app_role) OR private.has_role(me, 'admin'::public.app_role);

  IF is_team_member THEN
    SELECT count(*) INTO team_count
    FROM public.team_messages tm
    LEFT JOIN public.chat_last_seen ls
      ON ls.user_id = me AND ls.chat_kind = 'team' AND ls.chat_id = team_sentinel
    WHERE tm.user_id <> me
      AND tm.created_at > COALESCE(ls.last_seen_at, 'epoch'::timestamptz);
  END IF;

  WITH sub AS (
    SELECT cm.category_id, count(*) AS cnt
    FROM public.category_messages cm
    JOIN public.category_assignments ca
      ON ca.category_id = cm.category_id AND ca.user_id = me
    LEFT JOIN public.chat_last_seen ls
      ON ls.user_id = me AND ls.chat_kind = 'category' AND ls.chat_id = cm.category_id
    WHERE cm.user_id <> me
      AND cm.created_at > COALESCE(ls.last_seen_at, 'epoch'::timestamptz)
    GROUP BY cm.category_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category_id', c.id,
    'name', c.name,
    'count', sub.cnt
  ) ORDER BY c.name), '[]'::jsonb) INTO cats
  FROM sub
  JOIN public.categories c ON c.id = sub.category_id;

  RETURN jsonb_build_object(
    'team', team_count,
    'categories', cats,
    'total', team_count + COALESCE(
      (SELECT sum((e->>'count')::int) FROM jsonb_array_elements(cats) e), 0
    )
  );
END;
$function$;

-- Restrict direct execution of elevated public functions. Backend service-role
-- calls and triggers continue to work; browser/API clients cannot call these as RPC endpoints.
REVOKE ALL ON FUNCTION public.auto_link_invitation_inviter() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_committee_team_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_chat_unread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_inviters() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_current_user_committee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_invitations_fuzzy(uuid, text, real) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auto_link_invitation_inviter() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_committee_team_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_chat_unread() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_inviters() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_committee() TO service_role;
GRANT EXECUTE ON FUNCTION public.search_invitations_fuzzy(uuid, text, real) TO service_role;

-- Narrow invitation-media writes to event/media asset paths only.
DROP POLICY IF EXISTS "admin or team insert invitation media" ON storage.objects;
DROP POLICY IF EXISTS "admin or team update invitation media" ON storage.objects;
DROP POLICY IF EXISTS "admin or team delete invitation media" ON storage.objects;

CREATE POLICY "admin or team insert approved invitation media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invitation-media'
  AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role))
  AND (
    name IN ('hero-invitation.mp4', 'hero-invitation-inline.mp4')
    OR name LIKE 'event/%'
    OR name LIKE 'meal-photos/%'
    OR name LIKE 'faq/%'
  )
);

CREATE POLICY "admin or team update approved invitation media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invitation-media'
  AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role))
  AND (
    name IN ('hero-invitation.mp4', 'hero-invitation-inline.mp4')
    OR name LIKE 'event/%'
    OR name LIKE 'meal-photos/%'
    OR name LIKE 'faq/%'
  )
)
WITH CHECK (
  bucket_id = 'invitation-media'
  AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role))
  AND (
    name IN ('hero-invitation.mp4', 'hero-invitation-inline.mp4')
    OR name LIKE 'event/%'
    OR name LIKE 'meal-photos/%'
    OR name LIKE 'faq/%'
  )
);

CREATE POLICY "admin or team delete approved invitation media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invitation-media'
  AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'team'::public.app_role))
  AND (
    name IN ('hero-invitation.mp4', 'hero-invitation-inline.mp4')
    OR name LIKE 'event/%'
    OR name LIKE 'meal-photos/%'
    OR name LIKE 'faq/%'
  )
);

-- The extension warning is resolved by moving pg_trgm out of public. Functions
-- that use it now include extensions in their search path above.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;