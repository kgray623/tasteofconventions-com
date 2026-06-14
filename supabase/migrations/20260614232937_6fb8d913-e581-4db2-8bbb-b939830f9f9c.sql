WITH orphan_orders AS (
  SELECT
    cp.id,
    regexp_replace(cp.phone, '\D', '', 'g') AS phone_digits,
    cp.updated_at,
    cp.created_at
  FROM public.cuisine_preorders cp
  WHERE cp.invitation_id IS NULL
), candidate_matches AS (
  SELECT
    oo.id AS preorder_id,
    i.id AS invitation_id,
    row_number() OVER (
      PARTITION BY oo.id
      ORDER BY i.created_at DESC
    ) AS invitation_rank,
    row_number() OVER (
      PARTITION BY i.id
      ORDER BY oo.updated_at DESC NULLS LAST, oo.created_at DESC
    ) AS preorder_rank
  FROM orphan_orders oo
  JOIN public.invitations i
    ON i.guest_phone_normalized IN (
      oo.phone_digits,
      CASE WHEN length(oo.phone_digits) = 11 AND left(oo.phone_digits, 1) = '1' THEN substring(oo.phone_digits FROM 2) ELSE oo.phone_digits END,
      CASE WHEN length(oo.phone_digits) = 10 THEN '1' || oo.phone_digits ELSE oo.phone_digits END
    )
  WHERE length(oo.phone_digits) >= 7
    AND NOT EXISTS (
      SELECT 1
      FROM public.cuisine_preorders existing
      WHERE existing.invitation_id = i.id
    )
), chosen_matches AS (
  SELECT preorder_id, invitation_id
  FROM candidate_matches
  WHERE invitation_rank = 1
    AND preorder_rank = 1
)
UPDATE public.cuisine_preorders cp
SET invitation_id = cm.invitation_id,
    updated_at = now()
FROM chosen_matches cm
WHERE cp.id = cm.preorder_id
  AND cp.invitation_id IS NULL;