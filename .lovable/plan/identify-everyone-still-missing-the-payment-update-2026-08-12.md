# Identify everyone still missing the payment update

2026-08-12 23:56 UTC

## Verified database facts

- The database currently has **69 active preorder records**, each with a distinct nonblank phone number. The screen calls these “households,” but that label is not proven and will be replaced with **meal preorder contacts** unless a true household definition is established.
- Those records contain **134 plates across 106 cuisine order lines**.
- Payment records cover **12 people / 13 plates**. “13 paid” describes plates, not people.
- Today’s event history records **85 payment-update send actions across 57 people** under Kari Gray. Kari reports sending **54 actual texts**. Therefore, the event history currently overstates physical contact and cannot by itself prove who received a text.
- **9 unpaid people have no payment-update mark today**, covering **15 cuisine lines**:
  1. Adrianna Marie Gonzalez — Indonesian, Myanmar
  2. Aletta Blair — Myanmar
  3. Angela Waters — Myanmar (her African plate is paid)
  4. Cindy Garo — African
  5. Liza Efigenio — African, Indonesian, Myanmar
  6. Lori McLaren — African, Indonesian
  7. Rick & Maddie Madrid — Indonesian, Myanmar
  8. Stephanie Williams — Myanmar
  9. Whitney Hopkins — African, Indonesian
- Three paid people also received payment-update marks today: Maggie Gibson, Betsaida Ruiz, and Dee Anna Gotschall. Their marks remain retained as history, but they must not reduce or inflate the unpaid-contact queue.

## Correction

1. **Show the missing list immediately**
   - Make the primary queue list unpaid people with no verified payment-update text.
   - Show each person once, with every cuisine still requiring contact beneath their name.
   - Keep the 9 verified no-mark people above visible until each text is explicitly confirmed.

2. **Reconcile the reported 54 against the database**
   - Add a recipient-by-recipient “Texts sent today” review showing all 57 people currently marked, their cuisines, timestamps, and actor.
   - Let Kari confirm which 54 were actually sent and dispute the extra three without deleting any history.
   - Store each confirmation/dispute in the existing append-only evidence-review ledger.
   - Any disputed or unconfirmed contact returns to the pending queue; no one is silently treated as contacted.

3. **Use counts that describe one thing only**
   - Replace “69 households” with **69 meal preorder contacts** on this workflow.
   - Display separate measures: contacts, cuisine text messages, and plates.
   - Display payments as **12 paid contacts / 13 paid plates**.
   - Display the pending queue as both people and cuisine messages, never plates.

4. **Make sent tracking match a real human action**
   - Opening Messages records nothing.
   - A send is counted only after Kari explicitly confirms it after sending.
   - One person with multiple cuisine messages remains one contact but has multiple required messages; the screen must show both numbers.
   - Historical marks stay retained and auditable; corrections append evidence rather than deleting or overwriting submissions.

## Verification before any completion claim

- As Kari on `/admin/meal-texts` at **384×681**, verify the pending view visibly contains the 9 named people and all 15 listed cuisine lines before reconciliation.
- Review every one of the 57 people marked today and record exactly which 54 Kari confirms.
- Read back every evidence decision from the database.
- Recalculate the final pending list from active unpaid cuisine lines minus confirmed physical sends, then compare every displayed name to the database.
- Send and confirm one controlled pending text, verify that only that exact person+cuisine leaves the queue, then reverse the controlled mark and prove the baseline returns without lost history.

## Technical details

- Derive the queue from the canonical meal communication ledger plus evidence-review decisions; do not infer physical delivery from legacy/live mark rows alone.
- Group the UI by preorder contact while retaining cuisine-line keys for message generation and audit.
- Keep server-function modules as thin authenticated wrappers and perform reconciliation in imported server helpers.
