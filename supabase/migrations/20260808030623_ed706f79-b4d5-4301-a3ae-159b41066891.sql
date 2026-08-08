UPDATE public.app_settings
SET value = 'UPDATE REGARDING Your Catered Meal. The restaurants have given us a virtual pre-pay option for our catered meals through the secure option of Zelle. One offers Venmo too.

Thank you for your understanding as this is a first for all of us.

' || value
WHERE key = 'meal_text_template'
  AND value NOT LIKE 'UPDATE REGARDING%';