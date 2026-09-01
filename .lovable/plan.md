# Mark every album text shown in your screenshots

2026-09-01 02:50 UTC

The first screenshot batch (A through H, 8:12–8:30 PM) has already been recorded: 60 invitation records matched those phone numbers and were marked texted.

The additional screenshots extend the evidence through V and show messages sent from 8:31 PM onward. I will process all screenshots together, not stop at the earlier I–M batch.

## Scope

1. Extract every visible phone number from all screenshots and match it to the album roster using normalized phone digits, including international numbers.
2. For contact-name-only threads, match the displayed contact/first name to the roster only when there is one unambiguous guest.
3. Record an additive `album_text_sends` mark for each matched invitation, skipping any already recorded so nobody receives a duplicate database row.
4. Include conversations showing a reply or later message (such as “You’re welcome,” an emoji, or “Image”) when the thread itself identifies a roster guest; these screenshots still document that the guest was contacted.
5. Do **not** mark the Sonja message with the red failure symbol as sent. Report it separately as failed so it remains on the still-to-text list.
6. Do not guess ambiguous name-only contacts. Report each unmatched or ambiguous thread for confirmation.

## Verification and report

After recording the marks, read the database back and report:

- exact number newly marked from all screenshot batches;
- exact total marked texted on `/admin/album-texts`;
- exact number still to text;
- every screenshot phone/name that did not match the yes-RSVP album roster;
- every name-only thread that could not be matched uniquely;
- the failed Sonja number separately.

No guest, RSVP, message wording, photo, video, meal record, or prior text mark will be deleted or overwritten. Per-guest Undo remains available.

## Technical notes

- Match against `invitations.guest_phone_normalized` / `guest_phone` and the existing yes-RSVP album roster.
- Insert only missing rows into `album_text_sends`, labelled as evidence from Kari’s Messages screenshots.
- No application-code change is needed.
