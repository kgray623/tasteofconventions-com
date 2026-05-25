-- Update the default value for hero_intro in invitation_content table
ALTER TABLE public.invitation_content 
ALTER COLUMN hero_intro SET DEFAULT 'You are cordially invited to join us for a very special evening of association, cultural enrichment, gift exchanges, meeting new friends, and making wonderful memories — this side of paradise. See the video below for details.';

-- Update existing records
UPDATE public.invitation_content
SET hero_intro = 'You are cordially invited to join us for a very special evening of association, cultural enrichment, gift exchanges, meeting new friends, and making wonderful memories — this side of paradise. See the video below for details.'
WHERE hero_intro LIKE 'You are cordially invited to join us for a very special evening%more details.';