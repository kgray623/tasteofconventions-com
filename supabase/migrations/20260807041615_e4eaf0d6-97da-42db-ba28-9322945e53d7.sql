CREATE TABLE public.meal_text_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preorder_id uuid NOT NULL REFERENCES public.cuisine_preorders(id) ON DELETE CASCADE,
  cuisine text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  marked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preorder_id, cuisine)
);

GRANT SELECT ON public.meal_text_sends TO authenticated;
GRANT ALL ON public.meal_text_sends TO service_role;

ALTER TABLE public.meal_text_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and committee can view meal text sends"
ON public.meal_text_sends
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR public.is_current_user_committee()
);

CREATE TRIGGER set_meal_text_sends_updated_at
BEFORE UPDATE ON public.meal_text_sends
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER audit_meal_text_sends
AFTER INSERT OR UPDATE OR DELETE ON public.meal_text_sends
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

CREATE INDEX idx_meal_text_sends_preorder ON public.meal_text_sends(preorder_id);

INSERT INTO public.meal_text_sends (preorder_id, cuisine, sent_at, marked_by_label)
SELECT p.id,
       (public.normalize_preorder_selection(sel.value))->>'cuisine' AS cuisine,
       p.meal_text_sent_at,
       'backfill from per-guest mark'
FROM public.cuisine_preorders p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.selections, '[]'::jsonb)) AS sel(value)
WHERE p.meal_text_sent_at IS NOT NULL
  AND public.normalize_preorder_selection(sel.value) IS NOT NULL
  AND COALESCE((public.normalize_preorder_selection(sel.value))->>'cuisine', '') <> ''
ON CONFLICT (preorder_id, cuisine) DO NOTHING;