
create table public.entertainment_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  talent text,
  notes text,
  video_path text not null
);

alter table public.entertainment_submissions enable row level security;

create policy "anyone can submit entertainment"
  on public.entertainment_submissions for insert
  to anon, authenticated
  with check (true);

create policy "admin or team reads entertainment"
  on public.entertainment_submissions for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'team'::app_role));

insert into storage.buckets (id, name, public)
values ('entertainment-videos', 'entertainment-videos', false)
on conflict (id) do nothing;

create policy "anyone uploads entertainment video"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'entertainment-videos');

create policy "admin or team reads entertainment video"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'entertainment-videos'
    and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'team'::app_role))
  );
