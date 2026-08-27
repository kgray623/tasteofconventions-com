# George's African plate + combine the Sossou household

Verified against live records 2026-08-27 16:5x UTC.

## What the records show now

- **George Aderonmu** (402-706-1647, Tamara Madlock): order is African x1 **and** Indonesian x1. Only one payment on file — Indonesian x1, guest-reported (cashapp), recorded by Kari Gray. So the African plate is the unpaid one.
- **Juliet Sossou-Etse** (402-810-4177, Tina Santana): Indonesian x2, no payment on file.
- **Dodzi Sossou (With Juliette and Sasha)** (+32486589852, Tina Santana): Indonesian x1, no payment on file.

## Changes

1. **George**: cancel the African plate. His order becomes Indonesian x1 only, which stays paid. Nothing else on his record changes (RSVP yes, in person, credited to Tamara Madlock).
2. **Sossou household**: keep **Juliet Sossou-Etse — (402) 810-4177** as the single record with **Indonesian x2**. The duplicate Dodzi/+32 row's meal order is cancelled and the duplicate invitation is archived through the normal archive-and-audit delete path, so it stays visible under Admin → Recently deleted. Referral credit stays with Tina Santana.
3. **Payment**: record Indonesian x2 as paid **direct to the restaurant** on the kept Juliet record, with a note that payment was made to the restaurant (Koen) and the household was combined from the two duplicate rows.

## Expected result

- Total African plates drop by exactly 1; Indonesian plates drop by exactly 1 (the duplicate Dodzi plate).
- George disappears from the unpaid/needs-payment-text lists.
- Tina Santana's unpaid group loses both Sossou entries; only one Sossou household remains anywhere, with 2 Indonesian plates showing paid.

## Verification before I report done

- Read all three rows plus payment rows back from the database.
- Re-read African / Indonesian / Myanmar totals and report exact before/after numbers with a UTC timestamp.
- Check `/admin/unpaid`, `/admin/meal-texts`, and the Koen restaurant order list at 390px to confirm George's African plate and the duplicate Sossou row are gone and Juliet shows 2 Indonesian paid.

## Technical notes

- `cuisine_preorders.selections` edited for George (drop African) and for the Dodzi row (emptied), with the meal-reduction guard authorized explicitly since neither cancelled plate has a payment.
- Payment goes through the existing `recordMealPayment` path (source = guest_reported, method = restaurant direct) so `meal_payments` and `meal_order_status` stay in sync and the audit ledger records it.
- Duplicate invitation removed via `admin_delete_rows` so `deleted_rows_archive` + `audit_log` retain the full row; no submitted data is erased.
