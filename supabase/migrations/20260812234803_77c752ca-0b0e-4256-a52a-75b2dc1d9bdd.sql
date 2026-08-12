REVOKE ALL ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) TO anon;
GRANT EXECUTE ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_meal_order(uuid, text, text, jsonb, text[], text) TO service_role;