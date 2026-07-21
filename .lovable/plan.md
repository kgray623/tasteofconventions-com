Timestamp: 2026-07-21 UTC

Plan to fix the mobile navigation and page label:

1. Rename the admin navigation tab
   - Change the mobile/admin tab currently labeled **Committee** to **Committee Guests**.
   - Keep the same destination route so existing links still work: `/admin/inviters`.

2. Make it easier to find on mobile
   - Move/show **Committee Guests** next to the main **Guests** tab instead of making it look like a generic committee-management item.
   - Keep **Add committee** separate, so it is clear that **Committee Guests** is for seeing who each committee member invited.

3. Rename the page heading
   - Change the page title from committee/invitation wording to **Committee Guests**.
   - Add clear page text like: “See each committee member, how many guests they brought, and open their guest list.”

4. Preserve the existing guest-list functionality
   - Keep the mobile cards that show each committee member’s **Brought**, **In-person**, **Virtual**, and **Remaining** counts.
   - Keep the **Show guests (N)** button that expands each committee member’s invited guest list.

5. Verify on mobile
   - Open `/admin/inviters` in a mobile viewport.
   - Confirm the nav visibly shows **Committee Guests**.
   - Confirm tapping it opens the page with committee-member counts and expandable guest lists.