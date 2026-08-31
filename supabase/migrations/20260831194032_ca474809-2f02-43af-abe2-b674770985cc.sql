CREATE TABLE public.album_text_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  marked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.album_text_sends TO authenticated;
GRANT ALL ON public.album_text_sends TO service_role;

ALTER TABLE public.album_text_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and committee can view album text sends"
ON public.album_text_sends
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'team'::app_role));

CREATE TRIGGER audit_album_text_sends
AFTER INSERT OR DELETE OR UPDATE ON public.album_text_sends
FOR EACH ROW EXECUTE FUNCTION audit_row_change();

CREATE TRIGGER set_album_text_sends_updated_at
BEFORE UPDATE ON public.album_text_sends
FOR EACH ROW EXECUTE FUNCTION set_updated_at_generic();