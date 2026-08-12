CREATE TABLE public.meal_text_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign text NOT NULL CHECK (campaign IN ('original', 'payment_update')),
  action text NOT NULL CHECK (action IN ('sent', 'reversed')),
  preorder_id uuid NOT NULL,
  cuisine text NOT NULL,
  actor_id uuid,
  actor_label text,
  event_at timestamptz NOT NULL,
  evidence_source text NOT NULL CHECK (evidence_source IN ('human_action', 'legacy_live_mark', 'legacy_audit')),
  legacy_row_id uuid,
  legacy_audit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(cuisine) <> '')
);
GRANT SELECT ON public.meal_text_events TO authenticated;
GRANT ALL ON public.meal_text_events TO service_role;
ALTER TABLE public.meal_text_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized users can view meal text history"
ON public.meal_text_events FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
  OR public.is_current_user_committee()
);
CREATE UNIQUE INDEX meal_text_events_legacy_live_unique
ON public.meal_text_events (campaign, legacy_row_id)
WHERE legacy_row_id IS NOT NULL;
CREATE UNIQUE INDEX meal_text_events_legacy_audit_unique
ON public.meal_text_events (legacy_audit_id)
WHERE legacy_audit_id IS NOT NULL;
CREATE INDEX meal_text_events_current_state_idx
ON public.meal_text_events (preorder_id, cuisine, campaign, event_at DESC, created_at DESC);
CREATE INDEX meal_text_events_actor_idx
ON public.meal_text_events (actor_id, event_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_meal_text_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Meal text history is append-only';
END;
$$;
CREATE TRIGGER prevent_meal_text_event_update_delete
BEFORE UPDATE OR DELETE ON public.meal_text_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_meal_text_event_mutation();

INSERT INTO public.meal_text_events
  (campaign, action, preorder_id, cuisine, actor_id, actor_label, event_at, evidence_source, legacy_row_id)
SELECT 'original', 'sent', preorder_id, cuisine, marked_by, marked_by_label, sent_at, 'legacy_live_mark', id
FROM public.meal_text_sends
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_text_events
  (campaign, action, preorder_id, cuisine, actor_id, actor_label, event_at, evidence_source, legacy_row_id)
SELECT 'payment_update', 'sent', preorder_id, cuisine, marked_by, marked_by_label, sent_at, 'legacy_live_mark', id
FROM public.meal_zelle_text_sends
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_text_events
  (campaign, action, preorder_id, cuisine, actor_id, actor_label, event_at, evidence_source, legacy_audit_id)
SELECT
  CASE WHEN a.target_type = 'meal_text_sends' THEN 'original' ELSE 'payment_update' END,
  'reversed',
  (a.metadata->'old'->>'preorder_id')::uuid,
  a.metadata->'old'->>'cuisine',
  COALESCE(a.user_id, NULLIF(a.metadata->'old'->>'marked_by', '')::uuid),
  COALESCE(a.display_name, a.metadata->'old'->>'marked_by_label'),
  a.created_at,
  'legacy_audit',
  a.id
FROM public.audit_log a
WHERE a.target_type IN ('meal_text_sends', 'meal_zelle_text_sends')
  AND a.action LIKE 'DELETE%'
  AND a.metadata->'old'->>'preorder_id' IS NOT NULL
  AND COALESCE(a.metadata->'old'->>'cuisine', '') <> ''
ON CONFLICT DO NOTHING;

CREATE VIEW public.meal_accounting_lines
WITH (security_invoker = true)
AS
SELECT
  p.id AS preorder_id,
  p.invitation_id,
  p.name,
  p.phone,
  normalized.selection->>'cuisine' AS cuisine,
  SUM((normalized.selection->>'qty')::integer)::integer AS quantity
FROM public.cuisine_preorders p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.selections, '[]'::jsonb)) raw(selection)
CROSS JOIN LATERAL (
  SELECT public.normalize_preorder_selection(raw.selection) AS selection
) normalized
WHERE normalized.selection IS NOT NULL
  AND COALESCE((normalized.selection->>'qty')::integer, 0) > 0
GROUP BY p.id, p.invitation_id, p.name, p.phone, normalized.selection->>'cuisine';
GRANT SELECT ON public.meal_accounting_lines TO authenticated;
GRANT ALL ON public.meal_accounting_lines TO service_role;