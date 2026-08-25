# "Bring a covered dish" list — guests with no catered meal, by committee member

Read from the live database 2026-08-25 19:56 UTC.

## What the database says right now

Counting only guests who RSVP'd **yes** and are attending **in person** (Zoom and declines excluded), and who have **no active catered-meal order** (matched by invitation link or phone):

| Committee member | Guests | Seats |
| --- | --- | --- |
| Mysha Woods | 18 | 41 |
| Kari Gray | 10 | 22 |
| Shelley & Pat Monaghan | 8 | 12 |
| Tamara Madlock | 5 | 8 |
| Tina Santana | 4 | 5 |
| Betsaida Ruiz | 3 | 6 |
| Angela Waters | 3 | 3 |
| Janet Blaine | 3 | 4 |
| Jamy Elker, Jay Wilcher, Dixie Frahm, Mike and Tracey Curtis, Melissa Novotne | 1 each | 8 |

**Totals: 59 guests · 108 seats.** Everyone has a committee member recorded, but the page will still show a "No committee member recorded" group if that ever changes, so nobody is hidden.

## What you get

A new page at **/admin/covered-dish**, reachable with one tap from the Steering Committee landing page and the admin landing page as **"Covered dish reminders"** with a count badge.

At the top: total guests, total seats, and a "read from the database at HH:MM UTC" line. Then one group per committee member, sorted biggest first, each showing:

- Member name, their guest count and seat count
- Each guest: name, **tappable phone number**, party size, and a pink **Text** button that opens your own Messages app with the covered-dish reminder prefilled
- A **"Text all in this group"** button that opens one Messages draft addressed to every guest in that member's group who has a phone number
- Guests with no phone number on file are still listed, clearly marked "no phone on file", so they stay visible for a call or in-person ask

Same page and same list for admins and every committee member, matching how "Unpaid guests" already works. Nothing is deleted or hidden anywhere.

## The reminder message

Editable in one place (admin Event settings, same pattern as the meal text template), defaulting to:

> Hi [name]! You're on the list for A Taste of Special Conventions — Sunday, August 30, 4:00 PM at Eagle's Landing. Since you're not having a catered meal, please bring a covered dish to share. Thanks so much! — [your name]

## Access

Admins and committee (`team`) members only. Guests and logged-out visitors cannot reach it.

## Technical notes

- New server helper `src/lib/covered-dish.server.ts` + `src/lib/covered-dish.functions.ts`: read the current event's invitations with their RSVP row and inviter, exclude `status <> 'yes'` and `attendance_mode = 'zoom'`, exclude any invitation matched to a `cuisine_preorders` row with at least one selection (by `invitation_id` or normalized phone tail — the same matching `loadCommitteeMealTexts` uses), group by inviter.
- Reuses `phoneTail` from `src/lib/phone.ts` and the existing `SmsTextButton` component, so the tap-to-text behaviour and its fallback dialog are identical to every other Text button.
- New route `src/routes/_authenticated/admin/covered-dish.tsx` with its own `head()` metadata; nav entries added to `src/routes/_authenticated/admin/index.tsx` and the committee landing list.
- No schema change; no writes. This page is read-only reporting — it does not mark anything as sent, per the "only an explicit human action after the act" rule.

## Also outstanding from the last approval

The Carlson African beef payment (Zelle $27.38 to Senait/Lalibela, confirmation WFCT22KW4N2C, memo "beef meal for (402) 460-8121 Perry Carlson") was approved but the write was interrupted. I'll record that payment row and its follow-up note first, then build this page, and report both with read-back counts.

## Verification before I call it done

Playwright at 390px on the authenticated preview, as admin and as a non-admin committee login: screenshot of the totals banner and first groups with zero scrolling, a second screenshot of a named group further down, and one Text button inspected to confirm the `sms:` link carries the right number and body. Group counts re-read from the database with SQL and reported with a UTC timestamp.
