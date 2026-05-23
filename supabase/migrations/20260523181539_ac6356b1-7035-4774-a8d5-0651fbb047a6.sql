
CREATE TABLE public.invitation_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  hero_eyebrow text NOT NULL DEFAULT 'You''re Cordially Invited To',
  hero_title text NOT NULL DEFAULT 'A Taste of',
  hero_title_emphasis text NOT NULL DEFAULT 'Special',
  hero_title_suffix text NOT NULL DEFAULT 'Conventions',
  hero_tagline text NOT NULL DEFAULT 'An event and an evening to remember.',
  hero_intro text NOT NULL DEFAULT 'You are cordially invited to join us for a very special evening of association, cultural enrichment, gift exchanges, meeting new friends, and making wonderful memories — all on this side of paradise. See the video below for more details.',
  video_url text,
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  datetime_heading text NOT NULL DEFAULT 'Sunday, November 1, 2026 · 4:00 PM – 9:00 PM',
  datetime_body text NOT NULL DEFAULT 'Join us from 4:00 PM to 9:00 PM for a full evening together.',
  location_name text NOT NULL DEFAULT 'Eagle''s Landing',
  location_subtitle text NOT NULL DEFAULT 'La Platte, Nebraska',
  location_body text NOT NULL DEFAULT 'GPS coordinates and map will appear here once confirmed.',
  dress_body text NOT NULL DEFAULT 'This is an international event, so international attire is encouraged. Is there a culture you love to dress in? Please do — it''ll make the evening more fun and beautiful for everyone.',
  gifts_body text NOT NULL DEFAULT 'In the spirit of the special and international conventions, friends bring gifts to exchange. See the video below — it''ll walk you through exactly how it works.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitation_content readable by all"
  ON public.invitation_content FOR SELECT
  USING (true);

CREATE POLICY "admins manage invitation_content"
  ON public.invitation_content FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.invitation_content (itinerary) VALUES (
  '[
    {"country":"Myanmar","when":"Convention · 2014","note":"We open with Myanmar friends — flavors and stories from 2014.","restaurant":true},
    {"country":"Bolivia","when":"Convention · 2016","note":"Next, the highlands of Bolivia — a taste of 2016, shared together.","restaurant":true},
    {"country":"Ethiopia","when":"Convention · 2018","note":"Ethiopia, 2018 — coffee, community, conversation.","restaurant":true},
    {"country":"Nebraska","when":"Convention · 2026","note":"Home for the evening — La Platte, Nebraska.","restaurant":false}
  ]'::jsonb
);
