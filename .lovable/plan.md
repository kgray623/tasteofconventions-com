## Update RSVP page (`/rsvp/$token`)

File: `src/routes/rsvp.$token.tsx`

1. **Remove the Name/Phone box** at the top of the event card (lines 294–303) — the redundant "Name: … / Phone: …" panel shown under the date/location.

2. **Remove the event summary paragraph** (line 281) — the "Come spend an evening virtually traveling…" description rendered from `ev.description`. Keep the title, date, and location.

3. **Update the pre-order copy** (line 572) to read:

   > Cultural meals are $20.00–$30.00 per plate, paid directly to the restaurant. When you place your pre-order, you'll be provided the restaurant's contact information to pay for your order separately. Each cuisine offers a beef or chicken option, and all meals are gluten-free.

No other files, no data changes, no logic changes.
