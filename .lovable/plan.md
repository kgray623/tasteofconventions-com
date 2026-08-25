# Whitney Stone paid plate + cancel Nissa Hernandez's African plates

Timestamp: 2026-08-25 14:49 UTC

## What the two screenshots settle

1. **Whitney Stone (402-707-5335)** — the meal still left to pay is **Indonesian**, so the plate she already paid is her **Myanmar** plate.
2. **Nissa Hernandez (402-889-2119)** — her African meals were never paid; she "kept it simple and went with the one" (Indonesian). Her African order should be cancelled.

## What the database shows now (read 2026-08-25 14:49 UTC)

- Whitney: Indonesian 1 + Myanmar 1, **no payment rows at all**; two ambiguous follow-up notes from earlier today.
- Nissa: African 2 + Indonesian 3; only payment on file is **Indonesian 3, restaurant-confirmed**. Nothing paid on African.

## Changes

**Whitney Stone**
1. Record 1 **Myanmar** plate as paid — guest-reported (unverified), Myanmar restaurant linked, note recording her 2026-08-25 text.
2. Rewrite her two follow-up notes: Myanmar = paid, awaiting restaurant verification; Indonesian = still owed, restaurant calling her to process it.

**Nissa Hernandez**
3. Remove the **2 African plates** from her preorder (confirmed-removal path). Her 3 Indonesian plates and their restaurant-confirmed payment are untouched.
4. Add a follow-up note recording that she cancelled the African meals by text on 2026-08-25, so the change is visible and explained rather than silent.

Nothing is deleted anywhere else: both guests keep their RSVP, guest record, and full text/sent history.

## Expected result after the change

- Whitney's Myanmar plate leaves the unpaid list; her Indonesian plate stays with a clear note
- Nissa drops off the unpaid list entirely (no unpaid plates left)
- Plates ordered goes from 148 to 146; paid goes from 114 to 115; still-to-pay goes from 34 to 31
- The Myanmar restaurant portal shows Whitney's plate as reported, not yet verified; the African restaurant no longer sees Nissa's 2 plates

## Technical detail

- Insert one `meal_payments` row: `preorder_id = 25358151-…`, `cuisine = 'Myanmar'`, `qty_paid = 1`, `source = 'reported'`, `verified_at` null, `restaurant_id` from the Myanmar restaurant.
- Update the two `meal_follow_up_notes` rows for Whitney's preorder.
- Remove the African entry from `selections` on `preorder_id = 57cee7bd-…` via the existing confirmed-removal path, and insert one African follow-up note.
- No schema or code changes. All counts read back from the database and reported after the writes.
