
UPDATE public.invitation_content
SET
  dress_body = 'This is an event to enjoy culture — your culture, one you serve in, or one you have an interest in. Cultural dress is encouraged, or appropriate meeting or formal attire, please. This evening is festive and a beautiful occasion for all to enjoy. Convention badges are encouraged to be worn, and children are invited with a parent or guardian.',
  gifts_body = 'In the spirit of the special international conventions, friends bring small gifts to exchange with each other when meeting one another, in order to stay in touch and not lose contact with each other.',
  updated_at = now();

DELETE FROM public.categories
WHERE name IN (
  'Alcohol Attendant',
  'Food Servers',
  'Catered Food',
  'Director of the Feast',
  'MC',
  'Donations',
  'AI Invitations',
  'Zoom - Meetn attendant'
);
