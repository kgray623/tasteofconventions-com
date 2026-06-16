
-- 1) Archive table for deleted rows (restorable)
CREATE TABLE IF NOT EXISTS public.deleted_rows_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id text NOT NULL,
  row_data jsonb NOT NULL,
  deleted_by uuid,
  deleted_by_phone text,
  deleted_by_name text,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_rows_archive TO authenticated;
GRANT ALL ON public.deleted_rows_archive TO service_role;

ALTER TABLE public.deleted_rows_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read archive"
  ON public.deleted_rows_archive FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete archive"
  ON public.deleted_rows_archive FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS deleted_rows_archive_table_idx
  ON public.deleted_rows_archive (table_name, deleted_at DESC);

-- 2) Trigger function: snapshot OLD row into the archive on every DELETE
CREATE OR REPLACE FUNCTION public.archive_deleted_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone text;
  v_name text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), ''),
      coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name')
    INTO v_phone, v_name
    FROM auth.users WHERE id = v_uid;
  END IF;

  INSERT INTO public.deleted_rows_archive
    (table_name, row_id, row_data, deleted_by, deleted_by_phone, deleted_by_name)
  VALUES
    (TG_TABLE_NAME, coalesce((to_jsonb(OLD)->>'id'), ''), to_jsonb(OLD),
     v_uid, v_phone, v_name);

  RETURN OLD;
END;
$$;

-- 3) Attach archive + audit triggers to guest-data tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invitations','rsvps','inviters','team_invites','cuisine_preorders']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_archive_%s_delete ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_archive_%s_delete
         BEFORE DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_row()',
      t, t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s_change ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%s_change
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      t, t);
  END LOOP;
END $$;

-- 4) Duplicate flag pairs view: one row per unique invitation pair,
--    aggregating match_types into a text[] so the UI can show chips.
CREATE OR REPLACE VIEW public.duplicate_flag_pairs
WITH (security_invoker=on) AS
SELECT
  LEAST(invitation_a, invitation_b)    AS invitation_a,
  GREATEST(invitation_a, invitation_b) AS invitation_b,
  event_id,
  array_agg(DISTINCT match_type ORDER BY match_type) AS match_types,
  min(created_at) AS created_at
FROM public.duplicate_flags
GROUP BY 1, 2, 3;

GRANT SELECT ON public.duplicate_flag_pairs TO authenticated;
GRANT ALL ON public.duplicate_flag_pairs TO service_role;
