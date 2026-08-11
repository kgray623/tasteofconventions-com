UPDATE public.app_settings SET value = $tpl$UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

The following information is how to pre-pay your catered meal. Each restaurant can be paid by Zelle which is secure and direct.

Your pre-order is for {order}.

{restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

The restaurant will verify your payment within 72 hrs and you will have a bank receipt and your RSVP will be updated.

August 23rd is the last day to prepay.

At the event, please present your RSVP receipt when obtaining your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is an alternative to pre-paying a catered meal. We want to ensure no one is left out of the festivities.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee$tpl$, updated_at = now()
WHERE key IN ('meal_text_template','meal_zelle_text_template');