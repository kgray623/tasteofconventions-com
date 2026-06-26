-- Remove overly broad SELECT on category_assignments
DROP POLICY IF EXISTS "assignments readable by all authenticated" ON public.category_assignments;

-- Remove anonymous upload policy to entertainment-videos bucket
-- (uploads will go through a server-issued signed upload URL using service role)
DROP POLICY IF EXISTS "entertainment videos uploads use uuid filename" ON storage.objects;

-- Remove email-based read policy on team_invites (invites are phone-based;
-- acceptance is handled by SECURITY DEFINER trigger / ensure_committee_team_role)
DROP POLICY IF EXISTS "users read own invite" ON public.team_invites;

-- Remove broad listing SELECT on invitation-media bucket.
-- Public file access via /storage/v1/object/public/... still works on public buckets
-- without an RLS SELECT policy; this only removes the ability to LIST bucket contents.
DROP POLICY IF EXISTS "public read invitation media" ON storage.objects;
