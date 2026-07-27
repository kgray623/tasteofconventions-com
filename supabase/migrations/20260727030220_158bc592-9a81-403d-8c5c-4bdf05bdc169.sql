DO $$
DECLARE
  pairs jsonb := '[
    {"primary":"fa86baf9-06a9-4b9f-acac-049b7572c7f6","secondary":"2131586e-e938-4b39-8432-de169c4e019d","name":"Amy and Kenneth Moore"},
    {"primary":"a14af6c5-8ba6-45f8-9684-3b107b4d93f4","secondary":"d2daac95-45b3-4339-89a3-f36b0c383f1c","name":"Audrey and Joel Burr"},
    {"primary":"2c6f69b0-ce65-483c-9d72-2b817ead263b","secondary":"e64d3665-bae2-4081-b704-0ec4fc3fc22c","name":"Cindy and Mark Eldridge"},
    {"primary":"29457e26-28a6-4194-b6d6-315459906442","secondary":"810aff4e-d54b-471c-a882-8e6cff909ffb","name":"Kenny and Linda Drews"}
  ]'::jsonb;
  p jsonb;
  pid uuid; sid uuid; nm text;
  earliest timestamptz;
BEGIN
  PERFORM set_config('app.delete_authorized', 'yes', true);
  FOR p IN SELECT jsonb_array_elements(pairs) LOOP
    pid := (p->>'primary')::uuid;
    sid := (p->>'secondary')::uuid;
    nm  := p->>'name';

    SELECT min(responded_at) INTO earliest FROM public.rsvps WHERE invitation_id IN (pid, sid);

    UPDATE public.invitations SET guest_name = nm WHERE id = pid;
    UPDATE public.rsvps
       SET party_size = 2,
           status = 'no'::public.rsvp_status,
           responded_at = COALESCE(earliest, responded_at)
     WHERE invitation_id = pid;

    -- Retain the merged person's submitted data before removing the duplicate row.
    INSERT INTO public.deleted_rows_archive (table_name, row_id, row_data, deleted_by_name)
    SELECT 'rsvps', r.id::text, to_jsonb(r), 'merged into ' || nm
      FROM public.rsvps r WHERE r.invitation_id = sid;
    INSERT INTO public.deleted_rows_archive (table_name, row_id, row_data, deleted_by_name)
    SELECT 'invitations', i.id::text, to_jsonb(i), 'merged into ' || nm
      FROM public.invitations i WHERE i.id = sid;

    DELETE FROM public.rsvps WHERE invitation_id = sid;
    DELETE FROM public.cuisine_preorders WHERE invitation_id = sid;
    DELETE FROM public.guest_messages WHERE invitation_id = sid;
    DELETE FROM public.duplicate_flags WHERE invitation_a = sid OR invitation_b = sid;
    DELETE FROM public.invitations WHERE id = sid;
  END LOOP;
  PERFORM set_config('app.delete_authorized', 'no', true);
END $$;