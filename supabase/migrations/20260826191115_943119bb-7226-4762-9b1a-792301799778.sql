CREATE TABLE IF NOT EXISTS public.zoom_text_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  marked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invitation_id)
);

GRANT SELECT ON public.zoom_text_sends TO authenticated;
GRANT ALL ON public.zoom_text_sends TO service_role;

ALTER TABLE public.zoom_text_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and committee can view zoom text sends"
ON public.zoom_text_sends FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'team'::public.app_role)
);

CREATE TRIGGER set_zoom_text_sends_updated_at
BEFORE UPDATE ON public.zoom_text_sends
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER audit_zoom_text_sends
AFTER INSERT OR UPDATE OR DELETE ON public.zoom_text_sends
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();