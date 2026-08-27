# Merge the duplicate Vivian / Vivien Moore records

Verified 2026-08-27 18:49 UTC.

## Current verified facts

- Two invitations share the same phone number **(402) 838-5105**:
  - **Vivien Moore** — `df26ce99…`, phone stored as `14028385105`, RSVP **yes / Zoom / party of 1**, referral credit **Janet Blaine**, credited committee member **Kari Gray**.
  - **Vivian Moore** — `9ff515cd…`, phone `(402) 838-5105`, **no RSVP row at all**, no meal preorder, no guest messages, no Zoom text send.
- The pair is already flagged in `duplicate_flags` on both **phone** and **name** matches, so detection works; only the cleanup is missing.
- Neither record has a meal preorder or any payment, so no meal accounting changes.

## Execution plan

1. Keep **Vivien Moore** (`df26ce99…`) as the single record, exactly as-is: Zoom RSVP, party of 1, Janet Blaine referral credit.
2. Normalize its stored phone to the standard 10-digit display form `(402) 838-5105` so the search results no longer show a raw `14028385105`.
3. Archive the empty **Vivian Moore** invitation (`9ff515cd…`) through the normal admin deletion path so it is preserved in **Admin → Recently deleted** with a reason ("merged duplicate of Vivien Moore, same phone"). Nothing is hard-erased.
4. Clear the two now-resolved `duplicate_flags` rows for this pair.
5. Forward-fix so this cannot recur: the phone match already strips the country code, but confirm normalization of `guest_phone_normalized` drops a leading `1` on write, so `14028385105` and `4028385105` can never coexist as separate active guests.
6. Verify at 390×844 as Kari/admin:
   - Admin search for "Vivi" returns exactly **one** Vivien Moore row, shown as **Confirmed · Virtual** with `(402) 838-5105`.
   - `/admin/zoom-attendees` count is unchanged (the removed record was never a Zoom attendee) and contains Vivien Moore once.
   - Reconcile list no longer flags this pair.
   - Admin → Recently deleted retains the archived Vivian Moore invitation.
7. Report exact route results, counts, and a UTC timestamp with database read-back.

## Scope

No RSVP, meal, payment, referral, or committee-quota data is changed. The removed duplicate carries no submitted guest data and stays retained in the deletion archive.
