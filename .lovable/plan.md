## Goal

Angela Waters (402-616-1025) and Moriah Waters (402-619-0764) become steering committee members and are signed up to volunteer for **Set Up** and **Clean Up**.

## Current state (verified in the database)

- Angela Waters exists on the guest list with phone 402-616-1025, `is_committee = false`, linked under an existing inviter.
- Moriah Waters does not exist anywhere yet (no guest row, no committee row).
- Neither has a committee roster (inviter) row or a team invite.
- The **Set Up** and **Clean Up** volunteer categories both exist and currently hold signed-in-user assignments only.

## Changes (data only — no code changes)

1. **Moriah Waters** — add to the guest list with phone 402-619-0764 under the same event as Angela, marked as committee.
2. **Angela Waters** — flip her existing guest record to committee (her submitted RSVP, referral link, and meal data are left untouched).
3. **Committee roster** — create an active inviter row for each of them (name + phone) so they show on the Committee page and can add/see their own guests.
4. **Committee access** — create a pending team invite (`team`) for each phone, so when they log in with last name + phone number they automatically get committee access.
5. **Volunteer sign-ups** — add each of them by name to both the **Set Up** and **Clean Up** categories.

## Verification before reporting done

- Read back both guest rows (committee flag + phone), both inviter rows, both team invites, and all four volunteer assignments.
- Confirm on the actual pages at mobile width: Admin → Committee Guests lists both names, and Admin → Volunteers shows both under Set Up and Clean Up.
- Confirm nothing existing was removed: re-count guest rows and existing Set Up / Clean Up assignments before and after.
