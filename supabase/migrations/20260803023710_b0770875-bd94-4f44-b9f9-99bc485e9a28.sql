CREATE UNIQUE INDEX category_assignments_unique_user_category
ON public.category_assignments (category_id, user_id)
WHERE user_id IS NOT NULL;