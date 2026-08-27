create or replace function public.is_event_participant(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id is not null and (
    exists (select 1 from public.user_roles r where r.user_id = _user_id)
    or exists (select 1 from public.invitations i where i.host_id = _user_id)
    or exists (select 1 from public.inviters v where v.host_id = _user_id)
  )
$$;

revoke all on function public.is_event_participant(uuid) from public, anon;
grant execute on function public.is_event_participant(uuid) to authenticated, service_role;

-- shared_photos: ownership-bound insert, participant-scoped read
drop policy if exists "Signed in users can add shared photos" on public.shared_photos;
create policy "Guests can add their own shared photos"
on public.shared_photos for insert to authenticated
with check (uploaded_by = auth.uid() and public.is_event_participant(auth.uid()));

drop policy if exists "Signed in users can view shared photos" on public.shared_photos;
create policy "Event participants can view shared photos"
on public.shared_photos for select to authenticated
using (public.is_event_participant(auth.uid()));

-- storage: restrict guest-photos reads/uploads
drop policy if exists "Signed in users can read guest photos" on storage.objects;
create policy "Event participants can read guest photo files"
on storage.objects for select to authenticated
using (
  bucket_id = 'guest-photos'
  and public.is_event_participant(auth.uid())
  and exists (
    select 1 from public.shared_photos p
    where p.storage_path = storage.objects.name
  )
);

drop policy if exists "Signed in users can upload guest photos" on storage.objects;
create policy "Guests can upload their own guest photo files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'guest-photos'
  and (storage.foldername(name))[1] = (auth.uid())::text
);