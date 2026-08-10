INSERT INTO public.app_settings (key, value, updated_at) VALUES
('meal_zelle_text_template', 'IMPORTANT UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

This is an update regarding your Taste of Conventions catered meal.

In light of Jesus counsel about letting our yes mean yes, this is the information regarding your pre ordered catered meal request.

Each restaurant has provided a Zelle option which is a secure. Pre-pay with Zelle guarantees your meal. All catered meals must be pre-paid by AUGUST 23RD.

Thank you for your understanding in this matter.

For {restaurant_cuisine} your choices are:

{meal_choices}

{pay_sentence}

Your order is for {order}.

{meal_photos}

These are custom meals for our event that have been tasted by the Food Tasting Committee to ensure the quality.

Once you make a payment, the restaurant will update your profile to PAID.

Your receipt will appear in your bank account and in your RSVP.

August 23rd is the last day to prepay.

Please present your RSVP receipt at the event when obtaining your meal.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee


P.S. Anyone not prepaying aren''t guaranteed a meal. If you opt to not purchase a catered meal, please bring a covered dish.', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

UPDATE public.app_settings SET value = (SELECT value FROM public.app_settings WHERE key = 'meal_zelle_text_template'), updated_at = now() WHERE key = 'meal_text_template';