
CREATE OR REPLACE FUNCTION public.ensure_committee_team_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_comm boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT public.is_current_user_committee() INTO is_comm;
  IF is_comm THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'team')
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_committee_team_role() TO authenticated;
