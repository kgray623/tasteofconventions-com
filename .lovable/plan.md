## Reassign the 9 screenshot-confirmed guests to Tina

Timestamp: 2026-07-15 22:55 UTC

Confirmed: the "BW NE Tina…" SMS screenshots are Tina's list. I'll set `inviter_id` to Tina's inviter record (`d52a0902…`) for exactly these 9 phone numbers, matched by last-10 digits:

1. Laquita Jones — 402-208-6599
2. Latea Glenn — 402-686-5008
3. Delali & Kodjovi Pinto — 402-306-9752
4. Bob & Deanna Sadler — 402-637-2304
5. Faviola and Israel Gamino family — 402-298-6695
6. Jackie Williams — 402-378-5424
7. Brittany Avery — 402-676-1298
8. Margaret Gibson — 402-917-4152
9. Whitney Hopkins — 402-598-6777

### What will not change
- No changes to any other invitation.
- Kari's remaining guests stay Kari's.
- No deletions, no RSVP/token/phone/quota edits, no name rewrites.
- The prior 10-row plan in `.lovable/plan.md` is superseded by this list.

### Verification (after the data change)
- Read back: these 9 phones show Tina as inviter on `/admin/guests`.
- Tina's "Brought by" count increases by exactly 9.
- All other inviters' counts unchanged.
