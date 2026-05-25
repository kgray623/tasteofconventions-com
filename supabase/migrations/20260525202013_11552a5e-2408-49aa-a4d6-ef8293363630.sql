-- Update invitation_content defaults to correct date and time
ALTER TABLE public.invitation_content
  ALTER COLUMN datetime_heading SET DEFAULT 'Sunday, August 30, 2026 · 4:00 PM – 9:30 PM';

ALTER TABLE public.invitation_content
  ALTER COLUMN datetime_body SET DEFAULT 'Join us from 4:00 PM to 9:30 PM for a full evening together.';

-- Update any existing rows that still have the old defaults
UPDATE public.invitation_content
SET datetime_heading = 'Sunday, August 30, 2026 · 4:00 PM – 9:30 PM'
WHERE datetime_heading LIKE '%November 1, 2026%' OR datetime_heading LIKE '%9:00 PM';

UPDATE public.invitation_content
SET datetime_body = 'Join us from 4:00 PM to 9:30 PM for a full evening together.'
WHERE datetime_body LIKE '%9:00 PM%';