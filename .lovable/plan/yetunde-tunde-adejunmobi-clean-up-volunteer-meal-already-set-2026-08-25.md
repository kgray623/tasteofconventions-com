# Yetunde (Tunde) Adejunmobi — clean-up volunteer + meal already settled

Verified against the live database 2026-08-25 16:52 UTC.

## What the two texts say

1. **Saturday 5:56 PM** — "This is Tunde and I want only one meal, the Indonesian chicken dinner. I will pay by Zelle tonight."
2. **Today 11:50 AM** — "If you still have openings, I'd like to volunteer for clean-up after the celebration."

## What the database already shows

- **Yetunde Adejunmobi**, 785-477-9714 — order on file: **1 Indonesian plate**, exactly the one meal she asked for. Nothing to change.
- Her payment is already recorded **and restaurant-verified** (recorded 8/23, marked by Kari Gray, debit card phoned to Koen, paid on her behalf along with Linda Braddock). So the "I'll pay by Zelle tonight" text is already superseded — she is not on the unpaid list and should not be chased.
- **Clean Up** currently has 3 named volunteers (Kari Gray, Moriah Waters, Angela Waters) plus 2 unnamed slots — so there is an opening.
- Tunde has **no** volunteer assignment on any category yet.

## Change

1. Add **Yetunde Adejunmobi** as a volunteer on the **Clean Up** category, with a note recording that she offered by text on 2026-08-25 and her phone 785-477-9714 for coordination.
2. Add a follow-up note on her meal order stating her Saturday text asked for exactly 1 Indonesian chicken dinner and that it is already paid and restaurant-verified — so no Zelle payment is expected from her and no further payment text should go out.
3. Nothing is deleted or overwritten: her existing order, payment row, and verification stay exactly as they are.

## Expected result after the change

- Tunde appears in the Clean Up volunteer list on the subcommittee/volunteer screens.
- Her meal stays in the "Restaurant confirmed paid" bucket; unpaid totals do not move.

## Technical detail

One insert into `category_assignments` (category `Clean Up`, `volunteer_name` = "Yetunde Adejunmobi", note with phone + date), and one insert into `meal_follow_up_notes` for preorder `8558ada7-…` / cuisine `Indonesian`. No schema or code changes. Both rows read back from the database and reported with a UTC timestamp.
