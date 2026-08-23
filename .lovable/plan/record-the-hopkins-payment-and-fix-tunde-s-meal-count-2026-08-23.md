# Record the Hopkins payment and fix Tunde's meal count

Verified against the live database 2026-08-23 01:30 UTC.

## What the screenshots show vs. what the database has

**1. Reuben Hopkins — $21.90 Venmo, "Chicken meal ... for Roman Hopkins, w/ Reuben & Whitney Hopkins"**

- Order on file: **Whitney Hopkins**, 402-598-6777 — 1 African plate + 2 Indonesian plates (RSVP yes, in person, party of 3).
- Koen already confirmed the **2 Indonesian plates** as paid on Aug 22.
- The **1 African plate is still unpaid**, and $21.90 is exactly Lalibela's chicken price — so this Venmo covers the African plate.

**2. Tunde — "I want only one meal, the Indonesian chicken dinner. I will pay by Zelle tonight."**

- Order on file: **Yetunde Adejunmobi**, 785-477-9714 — **2 Indonesian plates**, RSVP yes, in person, **party of 1**.
- No payment recorded yet, and Koen has not confirmed anything.
- So the order is one plate too many, and the payment has not arrived yet.

## Fix

1. Record one **African** payment for Whitney Hopkins' order: 1 plate, source `committee_recorded`, marked by Kari Gray, `paid_at` = Aug 22 2026, method Venmo, note: "Venmo $21.90 from Reuben Hopkins for Roman Hopkins' chicken meal; screenshot on file." Left **unverified** so it lands in the Payments-to-verify queue for Lalibela to confirm — never faking a restaurant confirmation.
2. Reduce Yetunde Adejunmobi's Indonesian order from **2 plates to 1**, keeping the existing row (no delete, nothing else touched). No payment is recorded — she said she would pay by Zelle tonight, so she stays on the unpaid list until money is actually confirmed.
3. Read both rows back from the database and report before/after committee-wide unpaid totals (households, order lines, plates), plus the change in Indonesian and African plate counts for the restaurants.

## Technical detail

- Payment goes through the existing `recordMealPayment` helper in `src/lib/meal-payments.server.ts` (committee-record path) — no new logic, no schema change.
- The plate reduction updates `cuisine_preorders.selections` for that one order only; the reduction guard trigger allows it because no payment exists for that line.
- No code changes are required for either correction.
