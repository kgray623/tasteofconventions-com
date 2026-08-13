CREATE TABLE public.committee_text_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.inviters(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('sent', 'reversed')),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_label text NOT NULL,
  event_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.committee_text_events TO authenticated;
GRANT ALL ON public.committee_text_events TO service_role;

ALTER TABLE public.committee_text_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view committee text history"
ON public.committee_text_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'team')
);

CREATE POLICY "Staff can append their own committee text events"
ON public.committee_text_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'team')
  )
);

CREATE INDEX committee_text_events_inviter_time_idx
ON public.committee_text_events (inviter_id, event_at DESC, created_at DESC);

CREATE TRIGGER prevent_committee_text_event_mutation
BEFORE UPDATE OR DELETE ON public.committee_text_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_meal_text_event_mutation();