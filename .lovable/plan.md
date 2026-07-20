## RSVP form: colorful buttons + remove duplicate name/phone box

### 1. Remove the duplicate "Required before RSVP" box
On both `/rsvp` (`src/routes/rsvp.index.tsx`) and `/rsvp/$token` (`src/routes/rsvp.$token.tsx`), delete the second Full name / Mobile number block (the terracotta-outlined "Required before RSVP" card that sits just above the "Invited by" picker). Keep the original name/phone inputs at the top of the card — they're already marked required.

### 2. Recolor the choice buttons (no more black)
Replace the black-on-select (`border-ink bg-ink text-cream`) styling on these button groups with a warmer, prettier palette:

- **Attending / Decline**
  - Attending (selected): bright pink — `bg-pink-500 border-pink-500 text-white`
  - Decline (selected): keep dark — `bg-ink border-ink text-cream`
- **In-person / Virtual (Zoom)**
  - In-person (selected): terracotta — `bg-terracotta border-terracotta text-cream`
  - Zoom (selected): teal — `bg-teal-500 border-teal-500 text-white`
- Unselected state stays the current `border-border bg-card` with a soft hover tint matching each button's selected color.

Applies to both `/rsvp` and `/rsvp/$token`.

### Out of scope
No changes to meal cards, "Invited by" picker, submission logic, or copy.

### Verification
Playwright mobile screenshot of `/rsvp` confirming: (a) only one name/phone block, (b) Attending = pink, Decline = dark, In-person = terracotta, Zoom = teal.
