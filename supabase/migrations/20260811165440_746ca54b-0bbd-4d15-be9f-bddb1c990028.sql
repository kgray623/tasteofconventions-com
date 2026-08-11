ALTER TABLE public.meal_payments
  ADD COLUMN IF NOT EXISTS cancelled_meal_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_note text;

CREATE OR REPLACE FUNCTION public.guard_meal_payment_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: payment records are permanent and cannot be deleted. If the meal was cancelled, mark the payment as cancelled instead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Nobody may reassign a payment to a different order or cuisine.
  IF NEW.preorder_id IS DISTINCT FROM OLD.preorder_id
     OR NEW.cuisine IS DISTINCT FROM OLD.cuisine THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: a payment record cannot be moved to another order or cuisine.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A payment never becomes unpaid, smaller, or unverified.
  IF NEW.paid_at IS NULL AND OLD.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: a recorded payment cannot be set back to unpaid.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF COALESCE(NEW.qty_paid, 0) < COALESCE(OLD.qty_paid, 0) THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: the paid quantity cannot be lowered.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: a verified payment cannot be un-verified.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Restaurant confirmations are frozen; guest/committee reports may only be
  -- upgraded to a restaurant confirmation.
  IF OLD.source = 'restaurant' AND NEW.source IS DISTINCT FROM 'restaurant' THEN
    RAISE EXCEPTION 'PAYMENT_RECORD_LOCKED: a restaurant-confirmed payment cannot be changed to another source.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meal_payments_lock ON public.meal_payments;
CREATE TRIGGER meal_payments_lock
BEFORE UPDATE OR DELETE ON public.meal_payments
FOR EACH ROW EXECUTE FUNCTION public.guard_meal_payment_lock();