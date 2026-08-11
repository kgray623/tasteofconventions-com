# Put Kari Gray on the screen you are actually using

## Confirmed current state

- Your screenshots from **4:03–4:04 PM Chicago time** show the live mobile meal-text lists, and **Kari Gray is absent** from the African, Indonesian, and Myanmar sections.
- The source currently contains a conditional Kari mock row, but that source-level condition is not proof that it reached or rendered on your live screen.
- The required screen is `/admin/meal-texts` at **384×681**, with Kari’s test recipient **808-278-7562**.

## Correction

- Diagnose the actual authenticated data returned on the exact live route and identify why Kari’s conditional row is not rendering there.
- Make Kari’s three test rows explicit in the loaded admin meal-text result from her retained preorder, rather than relying on a fragile client-side name-and-phone search.
- Render **Kari Gray — mock message to myself** as the first row in African, Indonesian, and Myanmar, each with quantity **1**, **808-278-7562**, and **Text Kari (mock)**.
- Keep these test rows independent of paid status, sent status, “only unsent,” committee filters, pending counts, downloads, and tracking.
- Preserve all of Kari’s preorder and payment records; mock actions must write nothing.

## Proof required before reporting success

- Authenticate as admin and open the exact `/admin/meal-texts` route at **384×681**.
- Capture visible evidence of Kari as the first row in all three cuisine sections on the same environment the user opens.
- Inspect all three generated SMS targets and message bodies, then exercise each button’s Messages handoff.
- Read back Kari’s preorder plus `meal_text_sends`, `meal_zelle_text_sends`, and `meal_payments` before and after to prove no record changed.
- If the corrected code is only in preview and not the live custom-domain version, state that plainly and do not claim the live screen is corrected until that exact version is published and rechecked.

**Plan prepared: Aug 11, 2026, 21:04 UTC.**
