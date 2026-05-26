CREATE TABLE public.cuisine_preorders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  selections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.cuisine_preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit cuisine preorder"
ON public.cuisine_preorders
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(name) between 1 and 120
  AND char_length(phone) between 1 and 40
  AND jsonb_typeof(selections) = 'array'
);

CREATE POLICY "admins read cuisine preorders"
ON public.cuisine_preorders
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team'::app_role));