## Plan

1. **Correct the authentication description everywhere in the PDF source of truth**
   - Replace any statement that says there is “no password” or “phone-only with no password” with the correct rule:
     - **Username = last name**
     - **Password = phone number**

2. **Update the restored platform description**
   - Ensure the report clearly says guests/team users log in using their **last name as the username** and their **phone number as the password**.
   - Preserve the existing SMS-only/no-email rule and all other platform details.

3. **Update any AI-replication guidance**
   - Make sure the AI replication instructions do not tell a future builder to implement passwordless login.
   - Make the credential rule explicit so another AI can replicate the front office and back office correctly.

4. **Regenerate the shareable PDF**
   - Produce a corrected next version of the replication guide PDF.
   - Verify the generated PDF text includes the corrected login wording before providing the file.

## Technical Notes

- No app code changes unless you explicitly ask for them.
- This is a documentation/PDF correction only.
- I will not repeat the incorrect “no password” wording in the corrected report.

Timestamp: 2026-07-16 04:00 UTC