# "NEW" arrow on the bell + one-tap meal text sender

2026-08-03 15:30 UTC

## 1. Bell gets a NEW arrow

Add the red `NEW →` pill next to the notification bell in the header so people know to open it. It points at the bell, and disappears once tapped/seen (same behavior as the other NEW badges already in the app).

## 2. Meal texts — send from your own phone, one tap each

Short answer: no system can text on your behalf here (that would need a paid texting service and a verified number, and it would come from a strange number, not you). What I can do is make your phone do all 127 in a fraction of the time: a new admin page that opens your Messages app with the recipient and the full message already typed. You just hit send.

New page: **Admin → Meal texts** (`/admin/meal-texts`)

- Three sections: **Burmese (Myanmar)**, **African**, **Indonesian** — everyone who pre-ordered that cuisine, pulled live from the pre-order data (name, phone, quantity).
- **Send all at once (per cuisine):** one big button per cuisine that opens a single group text to everyone who ordered it — 3 taps instead of 127. Split automatically into chunks (about 20 numbers per text) so your phone doesn't choke.
- **Send one at a time:** each household gets its own row with a Text button, prefilled with their name and their order. Tapping it marks that row **Sent** with a date, so you never lose your place, and you can filter to "Not texted yet".
- Restaurant name and phone number for each cuisine are editable right on the page (saved to the event data), so the message always has the correct number.

### Message wording (from your draft — editable on the page)

> Hi {first name} — based on your RSVP for A Taste of Special Conventions, please contact the restaurant below to pre-order and pay for your catered meal.
>
> {Restaurant name} — {restaurant phone}
> Your order: {qty} {cuisine} meal(s)
>
> The restaurant has been notified that you will be calling, so please do so promptly. Thank you!

You can edit that text on the page before sending, and I'll show a live preview of exactly what goes out.

### What I need from you

The three restaurants' **names and phone numbers** (Burmese, African, Indonesian). If you'd rather, I'll ship the page with blank contact fields and you type them in yourself — nothing sends until they're filled.

One note on Indonesian: your existing description says orders wait until 50 pre-orders are reached. If Indonesian isn't ready yet, I'll mark that section "Hold — not ready to text" so it can't be sent by accident.

## Technical notes

- Data source: `cuisine_preorders` (parsed selections, same normalizer as the Preorder Report) joined to `invitations`/`rsvps` for the phone number when the pre-order row lacks one.
- Sending uses `sms:` links only (`sms:+1...,+1...?&body=`), consistent with the existing SMS-only, send-from-your-own-phone rule. No texting service, no automated sends.
- "Sent" state stored per pre-order household so it survives refresh and is visible to admins.
- Restaurant name/phone stored on the `restaurants` rows (currently only name/description/cuisine are set; phone is empty).
- Bell badge reuses `NewBadge` with a new target key so it shows once and then clears.
