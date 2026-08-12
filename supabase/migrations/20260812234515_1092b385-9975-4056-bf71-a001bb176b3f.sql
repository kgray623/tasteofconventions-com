CREATE TABLE public.meal_text_evidence_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_text_event_id uuid NOT NULL REFERENCES public.meal_text_events(id) ON DELETE RESTRICT,
  reviewer_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('confirmed', 'disputed')),
  note text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (note IS NULL OR btrim(note) <> '')
);
GRANT SELECT ON public.meal_text_evidence_reviews TO authenticated;
GRANT ALL ON public.meal_text_evidence_reviews TO service_role;
ALTER TABLE public.meal_text_evidence_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized users can view meal text evidence reviews"
ON public.meal_text_evidence_reviews FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR public.is_current_user_committee()
);
CREATE INDEX meal_text_evidence_reviews_event_idx
ON public.meal_text_evidence_reviews (meal_text_event_id, reviewed_at DESC, created_at DESC);
CREATE INDEX meal_text_evidence_reviews_reviewer_idx
ON public.meal_text_evidence_reviews (reviewer_id, reviewed_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_meal_text_evidence_review_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Meal text evidence reviews are append-only';
END;
$$;
CREATE TRIGGER prevent_meal_text_evidence_review_update_delete
BEFORE UPDATE OR DELETE ON public.meal_text_evidence_reviews
FOR EACH ROW EXECUTE FUNCTION public.prevent_meal_text_evidence_review_mutation();