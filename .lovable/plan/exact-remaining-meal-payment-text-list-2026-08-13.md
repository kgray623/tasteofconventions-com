# Exact Remaining Meal-Payment Text List

## Verified answer — August 13, 2026 at 05:11 UTC

I compared every currently active meal preorder against every platform text-sent mark recorded on **August 12 in Chicago time**, using normalized 10-digit phone numbers. No one was excluded because of role, inviter, payment state, RSVP ownership, or committee membership.

- **69** unique phone numbers currently have an active meal preorder.
- **55** of those active preorder phone numbers were marked sent on August 12.
- **14** active preorder phone numbers have no August 12 sent mark and are left to message.
- There are no duplicate phone numbers among the 69 active preorder contacts.
- The database has 57 marked contacts on August 12 overall, but Frank Skorniak and Gloria J. Groves now have empty/canceled meal selections. They are not part of the 69 active preorder contacts and are not included below.

## The 14 phone numbers left to message

| # | Name | Phone | Active preorder |
|---:|---|---|---|
| 1 | Adrianna Marie Gonzalez | **402-807-6980** | Indonesian, Myanmar |
| 2 | Aletta Blair | **402-999-1213** | Myanmar |
| 3 | Angela Waters | **402-616-1025** | African, Myanmar |
| 4 | Cindy Garo | **786-205-1210** | African |
| 5 | Gussie Sorensen | **402-830-7297** | Indonesian |
| 6 | Kari Gray | **808-278-7562** | African, Indonesian, Myanmar |
| 7 | Laura Haffke | **402-490-2907** | African |
| 8 | Liza Efigenio | **402-515-7916** | African, Indonesian, Myanmar |
| 9 | Lori McLaren | **402-213-1461** | African, Indonesian |
| 10 | Melissa Novotny | **402-679-6544** | Indonesian |
| 11 | Rahul Kumar | **531-484-7499** | Indonesian |
| 12 | Rick & Maddie Madrid | **562-326-4395** | Indonesian, Myanmar |
| 13 | Stephanie Williams | **402-686-9238** | Myanmar |
| 14 | Whitney Hopkins | **402-598-6777** | African, Indonesian |

## Platform correction

1. Replace the unreliable reconstructed 54-person logic with this direct contact-level calculation: every unique active preorder phone minus every phone explicitly marked sent for the selected communication date.
2. Include all active preorder contacts regardless of committee status, guest ownership, inviter, RSVP category, payment state, or cuisine.
3. Display one contact once with all ordered cuisines and the exact normalized phone number.
4. Label unsent actions neutrally as **Mark sent**; never show a check icon before the database contains the explicit sent mark.
5. Keep canceled/empty orders out of the active list without deleting their history.
6. Make the on-screen list and CSV use the identical database-derived result.

## End-to-end verification

- Verify the admin meal-text route at Kari's **384×681** viewport and admin role.
- Confirm the screen shows exactly **69 active / 55 marked sent / 14 left** and the same 14 names and phone numbers above.
- Open each SMS action and verify its recipient and cuisine instructions; opening Messages must not mark it sent.
- Mark one controlled contact sent, read the new record back from the database, reload, and verify the remaining count drops by exactly one.
- Verify the CSV contains the same remaining contacts as the screen.
- Confirm no preorder, RSVP, payment, sent mark, cancellation, or historical record was deleted, hidden, or overwritten.
