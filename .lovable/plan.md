Edit the "A Journey Together" section in `src/components/invitation-page.tsx`:

1. **Replace intro paragraph** (line 205) with: "Join us through the following conventions."

2. **Remove cuisine from the itinerary list** — drop the per-stop "Pre-order the cuisine" / "Savor the moment" pill (lines 222–231). Each list item shows only the step number, when, country, and note.

3. **Add a new paragraph + CTA below the itinerary card** (after line 236) reading:

   > Cultural meals are not required to attend. You may choose to pre-order a cultural meal at your discretion. They will be in the twenty dollar range per meal. Click to pre-order so we can negotiate with the restaurant once we have a meal count total. You will be updated with the menu to confirm in the coming weeks and to pay the restaurant direct.

   Followed by a single "Pre-order a cultural meal" link to `/preorder`, styled like existing sunset gradient buttons.

No data/schema changes. The `/preorder` page itself is untouched.