UPDATE public.invitation_content
SET itinerary = '[
  {"country": "Myanmar", "when": "Convention · 2014", "note": "We open with Myanmar friends — flavors and stories from 2014.", "restaurant": true},
  {"country": "Bolivia", "when": "Convention · 2016", "note": "Next, the highlands of Bolivia — a taste of 2016, shared together.", "restaurant": true},
  {"country": "Jakarta, Indonesia", "when": "Convention · December 2025", "note": "Our most recent gathering — the warmth of Jakarta, fresh in heart.", "restaurant": true},
  {"country": "Auckland, New Zealand", "when": "Convention · 2026", "note": "We close in Auckland, New Zealand — no menu to order from, just memories to make.", "restaurant": false}
]'::jsonb;