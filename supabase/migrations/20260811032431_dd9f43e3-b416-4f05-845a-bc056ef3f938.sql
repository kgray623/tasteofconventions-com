WITH tpl AS (
  SELECT $tpl$UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

The following information is how to pre-pay for your catered meal. Each restaurant provides Zelle which is secure and direct.

Your pre-order is for {order}.

{restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

The restaurant will verify your payment within 72 hrs. You will have both a bank receipt and your RSVP.

August 23rd is the last day to prepay which guarantees your meal.

At the event, please present your RSVP receipt for your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

You may opt to bring a covered dish as an alternative to pre-paying for a catered meal. Ensuring all have food for the event means pre-planning for all of us.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee$tpl$ AS v
)
INSERT INTO public.app_settings (key, value, updated_at)
SELECT k, (SELECT v FROM tpl), now()
FROM (VALUES ('meal_text_template'), ('meal_zelle_text_template')) AS t(k)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();