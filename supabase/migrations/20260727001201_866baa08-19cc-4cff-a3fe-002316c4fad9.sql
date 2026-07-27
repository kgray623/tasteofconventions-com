CREATE OR REPLACE FUNCTION public.sync_rsvp_ordering_food()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invitation_id IS NOT NULL
     AND coalesce(NEW.ordering_food, false) = false
     AND EXISTS (
       SELECT 1 FROM public.cuisine_preorders p
       WHERE p.invitation_id = NEW.invitation_id
         AND jsonb_array_length(coalesce(p.selections, '[]'::jsonb)) > 0
     ) THEN
    NEW.ordering_food := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rsvp_ordering_food ON public.rsvps;
CREATE TRIGGER trg_sync_rsvp_ordering_food
BEFORE INSERT OR UPDATE ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.sync_rsvp_ordering_food();