## Plan

1. **Move the search bar to the visible workspace area**
   - Keep the existing search component, but mount it in the admin/committee layout so it appears at the top of the admin/committee workspace instead of only on the Add guests/upload page.
   - This makes it visible from the main admin page, committee view, guest list, and related admin pages.

2. **Keep the dedicated guest-list search intact**
   - The `/admin/guests` page already has its own full roster search/filtering; I won’t remove it.
   - The global search bar will act as quick lookup across guests by name, phone, or committee member.

3. **Correct the guest owner links in the database**
   - Update these existing invitation records without deleting or overwriting guest information:
     - Mysha/Myisha Woods → Tina Santana
     - Gina Moore → Tina Santana
     - Jessica Diaz → Betsaida/Betsy Ruiz
   - I verified the current records are incorrectly associated with Kari Gray, and Tina Santana / Betsaida Ruiz both have active committee records.

4. **Verify end-to-end before reporting back**
   - Read the database back to confirm the three `host_id` associations changed to the correct committee members.
   - Open the admin/committee route at the current mobile viewport and confirm the search bar is visibly rendered where users will actually look for it.

**Timestamp:** 2026-07-16 UTC