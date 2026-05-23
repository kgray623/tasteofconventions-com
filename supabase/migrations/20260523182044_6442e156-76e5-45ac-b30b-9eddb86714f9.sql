
ALTER TABLE public.rsvps
  ADD COLUMN attendance_mode text NOT NULL DEFAULT 'in_person'
    CHECK (attendance_mode IN ('in_person', 'zoom'));
