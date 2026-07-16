I checked the database read-only before proposing changes:

- The app is showing **31** because the current UI's big status count is **people / party-size total**.
- There are **28 declined RSVP rows** in the database right now.
- The declined party-size sum is **31**.
- Robin/Robn Droz is present as two separate invitation records:
  - `Robin Droz` / `402740672` / party of 2
  - `Robn Droz` / `(402) 740-6722` / party of 1
- Those are not being grouped because one stored phone has **9 digits** and the other has **10 digits**. This is why the current duplicate grouping misses it.

Plan:

1. **Fix the admin guest list counts**
   - Change the status tabs/header so Declined uses the RSVP/guest-record count as the primary displayed number, not party-size people total.
   - Keep party-size totals visible only where they are explicitly labeled as people.
   - This will prevent “Declined 31” when the expected admin reconciliation count is the declined guest/RSVP count.

2. **Strengthen duplicate grouping for phone-number typos**
   - Update the duplicate-group logic to normalize phones and also catch likely missing-digit/extra-digit variants when the name is a close match.
   - Specifically, `402740672` and `4027406722` should be treated as the same likely duplicate because the shorter phone is contained in the longer one and the names are nearly identical.

3. **Collapse duplicate-looking guest rows in admin display/export**
   - For duplicate groups, show one canonical row in the admin guests list and CSV export.
   - Preserve the strongest RSVP status and safest party-size handling so data is not lost.
   - Keep submitted information retained in the database; this is display/export reconciliation, not deletion.

4. **Regenerate the full Excel dataset**
   - Rebuild the spreadsheet with corrected reconciliation logic.
   - Add a duplicate-review sheet showing grouped duplicate candidates, including the Robin/Robn Droz pair, so nothing is hidden.
   - Validate the declined counts from the rebuilt workbook against database queries before providing it.

5. **Verify end-to-end before saying it is corrected**
   - Check the admin guests route on the same mobile-sized viewport shown in your screenshots.
   - Confirm the Declined tab/header no longer presents the misleading 31 as the guest count.
   - Confirm Robin/Robn Droz no longer appears as two ordinary declined rows in the reconciled admin list/export, while still appearing in duplicate review.

Timestamp: 2026-07-16 UTC