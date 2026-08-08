update public.app_settings
set value = $tpl$UPDATE REGARDING Your Catered Meal. The restaurants have given us a virtual pre-pay option for catered meals through Zelle. One offers Venmo too.

Thank you for your understanding as this is a first for all of us.

Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and ordered a catered meal, the following is the information to pay for your catered meal direct online instead of calling the restaurant and paying over the phone.

Thank you for your patience and understanding as this is a first for all of us.

{restaurant_name} — {restaurant_cuisine}
{restaurant_zelle}

Your order is for {order}.

How to pay:
{payment_options}
{online_prices}

{meal_photos}

The restaurant has been notified you will be prepaying your meal, as they are making these meals exclusively for our event.

Please dear friend, pay by August 23rd to ensure your meal is ready for your arrival at the Taste of Conventions event.

Your receipt will be in your bank and will be in your RSVP at tasteofconventions.com. Please present at the event your purchase receipt to obtain your meal.

Thank you for your support in making this an encouraging experience for all! 😊

The Taste of Conventions Food Committee$tpl$,
    updated_at = now()
where key = 'meal_text_template';