UPDATE public.app_settings
SET value = replace(
  value,
  E'{zelle_link}\n\n{pay_sentence}\n\n{zelle_qr_link}',
  E'{zelle_qr_link}\n\nOpen Zelle in your bank app, then {pay_sentence}'
),
updated_at = now()
WHERE key IN ('meal_text_template', 'meal_zelle_text_template');