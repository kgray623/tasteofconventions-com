CREATE OR REPLACE FUNCTION private.user_owns_invitation(_invitation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') AS digits
    FROM auth.users WHERE id = _user_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.invitations i, me
    WHERE i.id = _invitation_id
      AND (
        i.host_id = _user_id
        OR (
          me.digits IS NOT NULL
          AND i.guest_phone_normalized IS NOT NULL
          AND length(i.guest_phone_normalized) >= 7
          AND right(i.guest_phone_normalized, 10) = right(me.digits, 10)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.user_owns_invitation(uuid, uuid) FROM public;

DROP POLICY IF EXISTS "guests send own messages" ON public.guest_messages;
CREATE POLICY "guests send own messages"
ON public.guest_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender = 'guest'
  AND user_id = auth.uid()
  AND private.user_owns_invitation(invitation_id, auth.uid())
);