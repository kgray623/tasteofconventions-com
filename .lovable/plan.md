Clean up the Committee SMS page to remove the noise you called out and fix the link domain. No visual-direction picker yet — this is structural cleanup. If you want a fresh visual redesign on top, tell me and I'll run the palette/type/layout round next.

## Changes

1. **RSVP link uses `tasteofconventions.com`**
   Today the preview generates `https://id-preview--…lovable.app/rsvp/…`. Hardcode the public site to `https://tasteofconventions.com` so every copied message contains the real, brandable link — in preview, in production, everywhere.

2. **Delete the "Bulk actions" card entirely**
   Drop the whole card and the "Copy all personalized messages" button. Per-row Copy is the only action that makes sense.

3. **Delete the "pending only" filter and its empty-state line**
   Remove the checkbox, the "pending only" badge in the list header, the `pendingOnly` state, and the "All committee guests have been texted or have RSVP'd. Uncheck the filter to see the full list." message. Always show the full committee list, alphabetical.

4. **Simplify each row**
   - One button per row labeled **Copy message**.
   - Keep the existing status badges (Committee, RSVP'd yes, delivered, not delivered) and the "Mark as delivered" checkbox.
   - Remove the duplicate "delivered / not delivered" text on the right side of the row — the badge already says it.

5. **Tighten the header**
   - Keep the four stat tiles (Committee 19, Not delivered, Delivered, RSVP'd yes — these now use the deduped roster).
   - Keep the message template card and preview as-is.
   - List header becomes: "Committee guests (N)" with a small refresh affordance.

## Out of scope
- No changes to the template wording or token placeholders.
- No changes to how RSVP'd-yes is counted (the roster fix from the last turn stays).
- No changes to other admin pages.