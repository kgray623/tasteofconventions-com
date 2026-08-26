-- Explicit, audited correction requested by Kari 2026-08-26: Tina Santana has
-- exactly one plate at each of the three restaurants. Her Myanmar (Burmese)
-- line was recorded as 2 plates in error, both order and reported payment.
-- The protective triggers are bypassed only for these two rows.

BEGIN;

SELECT set_config('app.meal_reduction_authorized', 'yes', true);

UPDATE public.cuisine_preorders
SET selections = '[{"cuisine":"African","qty":1},{"cuisine":"Indonesian","qty":1},{"cuisine":"Myanmar","qty":1}]'::jsonb
WHERE id = '9a57ad22-be2d-439b-adb0-2d055547c6d2';

ALTER TABLE public.meal_payments DISABLE TRIGGER USER;

UPDATE public.meal_payments
SET qty_paid = 1,
    reported_note = COALESCE(reported_note || ' — ', '')
      || 'Corrected 2026-08-26: 1 plate, not 2 (Tina Santana has 1 plate at each restaurant).',
    updated_at = now()
WHERE preorder_id = '9a57ad22-be2d-439b-adb0-2d055547c6d2'
  AND cuisine = 'Myanmar'
  AND qty_paid = 2;

ALTER TABLE public.meal_payments ENABLE TRIGGER USER;

UPDATE public.meal_follow_up_notes
SET note = note || E'\n\n2026-08-26 14:02 UTC: Corrected per Kari — Tina Santana has 1 plate at each restaurant. Myanmar reduced from 2 plates to 1 (order and reported payment).',
    updated_at = now()
WHERE id = '5811970d-2778-43fb-a360-72ca8613814c';

INSERT INTO public.audit_log (action, target_type, target_id, display_name, success, metadata)
VALUES (
  'meal_order_correction',
  'cuisine_preorders',
  '9a57ad22-be2d-439b-adb0-2d055547c6d2',
  'Kari Gray',
  true,
  jsonb_build_object(
    'guest', 'Tina Santana',
    'cuisine', 'Myanmar',
    'ordered_qty_before', 2,
    'ordered_qty_after', 1,
    'qty_paid_before', 2,
    'qty_paid_after', 1,
    'reason', 'Kari confirmed she has 1 plate at each restaurant'
  )
);

COMMIT;