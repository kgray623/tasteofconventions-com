# New "Order your catered cultural meal" wording

Plan written 2026-08-11 18:30 UTC.

## New intro paragraph (replaces the current one)

> Each cuisine offers a chicken or beef meal. All meals are gluten-free, MSG-free, and made only with beef tallow or butter. A chicken meal plate is $20 and a beef meal plate is $25. Taxes are below. You will pay the restaurant direct — the restaurants have requested that we use Zelle as the preferred method of payment. All catered meals must be paid for by Sunday, August 23.

Notes on what this drops from today's text:
- "call the number shown with your meal choice below" is removed, since Zelle is now the requested method. The restaurant's phone number still stays on each cuisine card as a backup.
- The "(*prices do not include sales tax or tip)" line stays where it already is, directly under each cuisine's price line — that is the "taxes are below" reference.

## Where it appears

The paragraph is one shared piece of copy, so the new wording shows up everywhere at once:
- RSVP form (`/rsvp` and the personal `/rsvp/<token>` link)
- My RSVP dashboard
- Standalone order page (`/preorder`)

No other wording, pricing, photos, Zelle buttons, payment records, or logic change.

## Technical detail

- Edit `MEAL_INTRO_COPY` in `src/lib/meal-pricing.ts` only. All four call sites already read it.
- Verification: Playwright at 384x681 on `/rsvp/<real token>`, `/my-rsvp`, and `/preorder`, confirming the exact new sentence renders and the per-cuisine price + tax lines are still directly below it.
