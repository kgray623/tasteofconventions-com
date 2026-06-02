CREATE OR REPLACE FUNCTION public.get_public_inviters()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH committee_names AS (
    SELECT i.id, btrim(i.name) AS name
    FROM public.inviters i
    WHERE i.active = true
      AND nullif(btrim(i.name), '') IS NOT NULL
    UNION ALL
    SELECT ti.id, btrim(ti.name) AS name
    FROM public.team_invites ti
    WHERE ti.role = 'team'::public.app_role
      AND nullif(btrim(ti.name), '') IS NOT NULL
    UNION ALL
    SELECT inv.id, btrim(inv.guest_name) AS name
    FROM public.invitations inv
    WHERE inv.is_committee = true
      AND nullif(btrim(inv.guest_name), '') IS NOT NULL
  ), deduped AS (
    SELECT id, name,
      row_number() OVER (PARTITION BY lower(name) ORDER BY name, id) AS rn
    FROM committee_names
  )
  SELECT id, name
  FROM deduped
  WHERE rn = 1
  ORDER BY name;
$function$;