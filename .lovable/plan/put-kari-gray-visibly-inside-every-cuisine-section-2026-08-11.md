# Put Kari Gray visibly inside every cuisine section

## Confirmed current state

- Kari Gray’s saved preorder is intact in the database: **808-278-7562**, with **1 African, 1 Indonesian, and 1 Myanmar meal**.
- The page currently creates Kari’s mock row only by searching each cuisine’s `paidRows` subset. That makes the test row disappear whenever the payment ledger does not classify her row into that subset, even though her preorder still exists.
- The correct screen is `/admin/meal-texts` at the mobile viewport **384×681**.

## Change

- Build Kari’s test entries directly from her saved preorder rows in the full meal dataset, matched by her normalized phone number and name—not from payment status.
- Render **Kari Gray — mock message to myself** as the first visible row inside each of the African, Indonesian, and Myanmar cuisine sections.
- Show **808-278-7562**, quantity **1**, and a prominent **Text Kari (mock)** button in every section.
- Keep the mock rows visible regardless of “only unsent,” committee-member filters, paid status, or sent status.
- Use the same cuisine-specific live message renderer, restaurant details, prices, Zelle instructions, and links used for real guest messages.
- Keep the mock rows completely outside pending counts and tracking. They will have no “Check here after you text” action and will not write payment or sent-message records.
- Preserve Kari’s saved preorder and all payment history unchanged.

## Verification

- Sign in as admin and open `/admin/meal-texts` at exactly **384×681**.
- Visually confirm Kari is the first row inside all three cuisine sections, with her phone number and quantity 1.
- Inspect each generated SMS target and body: all three must target **8082787562** and contain the correct cuisine-specific live message.
- Test the African, Indonesian, and Myanmar mock buttons from the exact route.
- Read the database before and after to confirm no rows were added or changed in meal-text sends, Zelle-text sends, payments, or Kari’s preorder.
- If the current transient “Failed to fetch” occurs during verification, diagnose that authenticated server-function request and repeat the full route verification before reporting success.

**Plan prepared: Aug 11, 2026, 20:42 UTC.**
