CREATE TABLE public.burmese_recheck_text_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL UNIQUE,
  guest_name text,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  marked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.burmese_recheck_text_sends TO authenticated;
GRANT ALL ON public.burmese_recheck_text_sends TO service_role;

ALTER TABLE public.burmese_recheck_text_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view burmese recheck sends"
ON public.burmese_recheck_text_sends
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team'));

CREATE TRIGGER set_burmese_recheck_text_sends_updated_at
BEFORE UPDATE ON public.burmese_recheck_text_sends
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER audit_burmese_recheck_text_sends
AFTER INSERT OR UPDATE OR DELETE ON public.burmese_recheck_text_sends
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();