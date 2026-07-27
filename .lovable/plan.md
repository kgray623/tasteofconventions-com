## Plan

1. **Update Jody Wade’s RSVP**
   - Change Jody Wade’s RSVP from **Yes / In person** to **Yes / Virtual (Zoom)**.
   - Preserve the existing guest record and RSVP history fields that should not change, including name, phone, invitation link, and party size unless you tell me otherwise.

2. **Verify the database read-back**
   - Read Jody Wade’s row after the update and confirm it shows:
     - `status = yes`
     - `attendance_mode = zoom`
     - the same invitation/guest record

3. **Verify the admin/committee visibility path**
   - Check that the corrected RSVP can appear in the guest list / newest RSVP views with the correct virtual status.
   - If any notification or newest-RSVP ordering depends on this changed timestamp, update only what is necessary so the correction is visible when requested.

## Confirmed current state

Jody Wade currently exists as one invitation record and one RSVP record, and the RSVP is currently marked **yes / in_person**. The correction is to make that RSVP virtual/Zoom.