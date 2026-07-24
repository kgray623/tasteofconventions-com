## What's likely happening

Your last screenshot was the RSVP page on your phone, and after I edited that route the file rebuilt while your browser tab was still open. One of the two live preview viewers is now timing out (not responding at all), which is the classic symptom of a stuck HMR (hot-reload) session on mobile — not a code bug. The admin viewer on the same account is loading fine.

There are two things to do:

1. **Unstick your current tab now** (does not require code changes)
2. **Harden the RSVP page so a stuck load can't look frozen with no way out**

## Step 1 — Unstick the tab (you do this on the phone)

- Fully close the browser tab (swipe it away, don't just background it)
- Reopen the preview URL fresh
- If it's still blank, open the phone browser menu → "Clear site data" (or use a Private/Incognito tab once) and load the RSVP link again

That alone should bring the page back. No code change can un-freeze a tab that's already stuck on an old bundle.

## Step 2 — Make the RSVP page recover itself next time

I'll make three small, presentation-only changes to `src/routes/rsvp.$token.tsx`:

1. **Shorter, visible loading timeout.** Today the page has a silent 10-second fallback that just flips `loading` off. I'll shorten it to 6 seconds and, if the server function still hasn't answered, show a "Taking longer than expected" card with a **Reload page** button and a **Back to invitation** link — so you're never staring at "Loading…" forever.
2. **Explicit error state.** If the server function throws (network hiccup, expired token), show the same recovery card instead of silently rendering nothing.
3. **Guard against stale drafts.** Clear the localStorage draft scope for this token if the stored draft is malformed JSON, so a bad draft from an older build can't wedge the page.

No business logic, math, RSVP totals, or database calls change. This is strictly UI resilience on the guest RSVP screen.

## Files touched

- `src/routes/rsvp.$token.tsx` — loading/error UI only

## What I will NOT touch

- Any totals, party-size math, or "people-first" counting
- Any admin, committee, or volunteer screens
- Any database rows, triggers, RLS, or server functions
- Any submitted guest / RSVP / pre-order data

## Verification before I say it's done

- Reload `/rsvp/<a real token>` on mobile viewport and confirm the page renders
- Simulate a slow load and confirm the recovery card appears with a working Reload button
- Confirm existing RSVPs still show their saved status, party size, mode, meals, and "invited by"
