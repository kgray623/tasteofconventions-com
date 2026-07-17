## Add Zimbabwe alongside Mozambique (same line)

Keep one African stop, showing both countries together.

### Changes
1. **DB migration/update** on `invitation_content.itinerary`: change the Mozambique entry's `country` from `"Mozambique"` to `"Mozambique & Zimbabwe"`. Leave `when`, `restaurant`, and `note` unchanged.
2. **Preorder label** (`src/routes/preorder.tsx` → `cuisineLabel`): add a branch so a country containing "mozambique" or "zimbabwe" renders as `"African — Mozambique & Zimbabwe"`. Existing `normalizeCuisine` in `src/lib/preorder-math.ts` already maps both to "African", so pre-order rollups stay consistent.
3. **Verify** on `/` (itinerary section) and `/preorder` at 384px viewport that the line reads "Mozambique & Zimbabwe" / "African — Mozambique & Zimbabwe", and that submitting a pre-order still records under the African cuisine bucket.

No other stops, restaurants, guests, or RSVPs are touched.

**Timestamp:** 2026-07-17 UTC