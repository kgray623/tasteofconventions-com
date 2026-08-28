create or replace function public.is_event_participant(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select
      coalesce(
        nullif(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), ''),
        nullif(regexp_replace(split_part(coalesce(u.email, ''), '@', 1), '\D', '', 'g'), '')
      ) as digits
    from auth.users u
    where u.id = _user_id
  )
  select _user_id is not null and (
    exists (select 1 from public.user_roles r where r.user_id = _user_id)
    or exists (select 1 from public.invitations i where i.host_id = _user_id)
    or exists (select 1 from public.inviters v where v.host_id = _user_id)
    -- Invited guests sign in with last name + phone number and never get a
    -- user_roles row, so match their auth phone (or internal phone login
    -- address) against the guest list by last 10 digits.
    or exists (
      select 1
      from public.invitations i, me
      where me.digits is not null
        and length(me.digits) >= 10
        and coalesce(i.guest_phone_normalized, '') <> ''
        and right(i.guest_phone_normalized, 10) = right(me.digits, 10)
    )
    or exists (
      select 1
      from public.inviters v, me
      where me.digits is not null
        and length(me.digits) >= 10
        and coalesce(regexp_replace(coalesce(v.phone, ''), '\D', '', 'g'), '') <> ''
        and right(regexp_replace(v.phone, '\D', '', 'g'), 10) = right(me.digits, 10)
    )
  )
$$;

revoke all on function public.is_event_participant(uuid) from public, anon;
grant execute on function public.is_event_participant(uuid) to authenticated, service_role;