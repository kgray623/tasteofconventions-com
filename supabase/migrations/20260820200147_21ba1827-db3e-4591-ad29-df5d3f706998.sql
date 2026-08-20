-- 1) Restaurant-confirmed orders whose payment row was never stamped verified.
UPDATE public.meal_payments mp
SET verified_at = s.confirmed_at,
    source = 'restaurant',
    updated_at = now()
FROM public.meal_order_status s
WHERE s.preorder_id = mp.preorder_id
  AND lower(s.cuisine) = lower(mp.cuisine)
  AND s.confirmed = true
  AND s.confirmed_at IS NOT NULL
  AND mp.verified_at IS NULL;

-- 2) Mirror rows for payment-update "sent" events that never reached the legacy table.
INSERT INTO public.meal_zelle_text_sends (preorder_id, cuisine, sent_at, marked_by, marked_by_label)
SELECT DISTINCT ON (e.preorder_id, lower(e.cuisine))
  e.preorder_id, e.cuisine, e.event_at, e.actor_id, e.actor_label
FROM public.meal_text_events e
WHERE e.campaign = 'payment_update'
  AND e.action = 'sent'
  AND NOT EXISTS (
    SELECT 1 FROM public.meal_zelle_text_sends z
    WHERE z.preorder_id = e.preorder_id AND lower(z.cuisine) = lower(e.cuisine)
  )
  AND EXISTS (SELECT 1 FROM public.cuisine_preorders p WHERE p.id = e.preorder_id)
ORDER BY e.preorder_id, lower(e.cuisine), e.event_at DESC, e.created_at DESC;