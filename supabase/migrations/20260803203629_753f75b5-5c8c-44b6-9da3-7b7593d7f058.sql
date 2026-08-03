update public.app_settings
set value = 'Hi {first_name} —

Because you RSVP''d for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_phone}
{restaurant_website}

Your order is for {order}

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊',
    updated_at = now()
where key = 'meal_text_template';

insert into public.app_settings (key, value, updated_at)
select 'meal_text_template', 'Hi {first_name} —

Because you RSVP''d for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_phone}
{restaurant_website}

Your order is for {order}

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊', now()
where not exists (select 1 from public.app_settings where key = 'meal_text_template');