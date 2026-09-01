# Mark the rest of your album texts as sent

2026-09-01 02:49 UTC

The first batch (A through H, 8:12–8:30 PM) is already marked — 60 guests were matched and recorded on the Photo album texts page from your earlier screenshots.

This second batch of screenshots covers 8:31–8:43 PM (I through M names). Same treatment: read each phone number, match it to the guest, and record a "texted" mark.

## What will be marked from this batch

Phone numbers read off the screenshots:

402-960-6589, 402-378-5424, 402-677-9043, 402-913-6508, 402-612-3689,
402-913-7899, 917-532-9859, 708-214-0846, 347-643-8667, 402-917-0578,
402-469-5215, 402-203-5207, 402-651-7937, 402-905-2445, 402-714-6206,
402-203-1672, 314-250-2831, 402-216-7691, 773-886-2304, 720-404-9198,
417-824-4078, 402-680-5946, 402-359-0467, 402-301-6751, 402-968-1680,
402-570-9844, 402-810-4177, 402-981-5700, 402-984-0368, 402-686-5008,
308-530-6543, 402-616-8205, 502-644-1141, 402-296-9922, 804-931-4514,
417-439-6438, 646-228-3195, 402-651-7573, 929-355-2673, 402-321-5203,
402-813-2696, 708-705-8612, 505-398-5414, 402-202-3534, 402-238-8375,
402-213-1461, 402-515-7916, 402-981-4025, 402-999-2600, 402-547-9159,
531-203-6157, 402-320-7780, 646-323-6963, 925-334-9519, 402-917-4152,
402-871-8841, 402-507-1651, 402-850-4808, 347-847-6743, 303-946-5800,
702-203-0468, 502-709-1424, +62 895-1748-7266 (Meidellin), +7 733-505-1619 (Lee)

Threads shown only by contact name with no visible number (BW Jamy Elker, NE Jacqueline
Graves WB, Jacquelyn, Jennifer, NE Jen Gray BW, NeJana Weinberger WB, NE TOC Janet Blaine,
NE Andres Rosa Guiterrez, BW Jay Wilcher, NE Julie Hegnet, MO Lenora, NE Mari Elva Uribe,
Maribel May) cannot be matched by number. I will match those by first name against the
album list and report each one I matched, plus any I could not, rather than guessing.

## Steps

1. Match every number above against guest phone numbers on the album list (last 10 digits, so
   formatting differences don't matter), and record a texted mark for each match.
2. Match the name-only threads by first name; only mark ones with a single unambiguous match.
   List anything ambiguous or unmatched for you to confirm.
3. Read back from the database and report exact counts: total texted, still to text, and any
   numbers in the screenshots that are not on the album list at all.
4. Nothing is deleted or overwritten — marks are additive, and Undo still works per guest.

## Technical notes

- Inserts into `album_text_sends` keyed by `invitation_id`, skipping guests already marked,
  labelled as coming from your Messages screenshots.
- No changes to code, RSVP data, meal data, or the album message wording.
