UPDATE public.rsvps
SET
  status = 'yes',
  attendance_mode = 'zoom',
  responded_at = now()
WHERE id = '66395a0b-ef49-415a-8e20-fe2c9c12f3ea'
  AND invitation_id = 'e83ed632-b7f1-4dfb-8a92-43a820cce360';