INSERT INTO public.app_settings (key, value, updated_at) VALUES
('meal_text_template', 'UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

This is an update to your Taste of Conventions catered pre-order meal.

The following information is how to pre-pay. Each restaurant has provided Zelle which is secure and direct.

For {restaurant_cuisine} your choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

Your order is for {order}.

The restaurant will verify your payment within 72 hrs and your RSVP will be updated and verified.

August 23rd is the last day to prepay.

Please present your receipt at the Taste of Conventions event in order to obtain your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is the alternative to a pre-paid catered meal ensuring no one is left out of the festivities.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee', now()),
('meal_zelle_text_template', 'UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

This is an update to your Taste of Conventions catered pre-order meal.

The following information is how to pre-pay. Each restaurant has provided Zelle which is secure and direct.

For {restaurant_cuisine} your choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

Your order is for {order}.

The restaurant will verify your payment within 72 hrs and your RSVP will be updated and verified.

August 23rd is the last day to prepay.

Please present your receipt at the Taste of Conventions event in order to obtain your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is the alternative to a pre-paid catered meal ensuring no one is left out of the festivities.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();