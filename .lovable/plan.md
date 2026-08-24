# Rephrase meal waiting list as "prepay wait list" and update follow-up notes

## Goal
Replace guest-facing "meal waiting list" wording with "prepay wait list" so it is clear that payment is required up front and the restaurant's acceptance of that payment confirms the spot. Also update follow-up notes for guests who gave payment dates.

## Wording changes

### 1. `src/lib/meal-pricing.ts`
- `MEAL_PAY_DEADLINE_LINE`: change to "Preordering is closed. Pay now to join the prepay wait list — once the restaurant accepts your payment, your plate is confirmed."
- `MEAL_INTRO_COPY`: replace "waiting-list request" language with "prepay wait-list request" and remove any implication that a plate is unconfirmed after payment; the confirmation happens when the restaurant accepts the payment.

### 2. `src/components/invitation-page.tsx` (itinerary card)
- Replace the paragraph so it says preordering is closed, guests may pay a restaurant directly to join the prepay wait list, and the restaurant will confirm once the payment is accepted.
- Change button label from "RSVP or join the meal waiting list" to "RSVP or join the prepay wait list".

### 3. `src/components/meal-waiting-list-request.tsx`
- `MEAL_PREORDER_CLOSED_NOTICE`
- JSDoc comment (line 40)
- Validation toast: "Choose how you paid the restaurant — payment is required to join the prepay wait list."
- Success toast: "Payment reported — you're on the prepay wait list. We'll confirm with the restaurant."
- Submitted-state heading: "Prepay wait-list request received"
- Button label: "I've paid — add me to the prepay wait list"

### 4. `src/routes/preorder.tsx`
- Update `description` and `og:description` meta tags to use "prepay wait list".

### What stays unchanged
- RSVP building-capacity "waitlist" status, labels, and logic are not touched.
- Pricing numbers, restaurant names, and payment methods remain unchanged.

## Follow-up note updates

Update existing `meal_follow_up_notes` rows (or create them if absent) for these guests, preserving any existing note text:

- **Kenda Anderson** — add/update note: paying on Wednesday.
- **Deshaun Bradley** — add/update note: paying on Wednesday.
- **Tina Santana** — add/update note: paying today.

The user mentioned one additional person whose name they could not recall; that will be handled in a follow-up once identified.

## Verification

- Run TypeScript typecheck.
- Use Playwright at 384x681 to screenshot:
  - `/preorder` — headline, notice, and button text
  - a real `/rsvp/<token>` — waiting-list form copy and button
  - `/` home page itinerary card — paragraph and CTA button
- Read back the three follow-up notes from the database to confirm the text is saved.
