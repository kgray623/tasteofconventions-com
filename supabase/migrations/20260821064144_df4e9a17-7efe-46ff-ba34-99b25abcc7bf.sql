insert into public.invitations (event_id, host_id, guest_name, guest_phone, is_committee, inviter_id)
select '00000000-0000-0000-0000-000000000001',
       'f1d06524-a7c5-4ea8-ae62-7bc2d50ad1dc',
       'Eileen and Blane Annoye',
       '4028508966',
       false,
       '2486b501-507f-477f-a565-20e3d9eae752'
where not exists (
  select 1 from public.invitations where guest_name ilike 'Eileen and Blane Annoye'
);