**2026-07-22 21:29 UTC — Aisha Moore audit, only Aisha Moore**

**What I verified in the database**
- There are **0 deleted/archive rows** for Aisha Moore.
- There are **0 current guest/invitation rows named Aisha Moore**.
- There is **1 RSVP text reference** where `invited_by` says **Aisha Moore**.
- There is now **1 committee/guest-list owner row** for Aisha Moore, created on **2026-07-22 20:58 UTC**.
- There is now **1 pending committee invite row** for Aisha Moore, also created on **2026-07-22**, but it has **no phone number**, so it is not a complete login/role record.

**What happened**
1. **2026-07-16 04:16 UTC** — Anita Lindell’s RSVP was created and the RSVP text said she was **invited by Aisha Moore**.
2. At that time, **Aisha Moore was not created as her own guest/contact row** in the `invitations` table, and she was not created as a committee/inviter row either. The system only stored her name as free text on Anita’s RSVP.
3. **2026-07-18 19:26 UTC** — a later association/backfill changed Anita’s record from having no inviter link to being linked to the wrong committee record. That happened because Aisha did not exist as a real committee/inviter row for the system to link to.
4. **2026-07-22 20:58 UTC** — I created the missing Aisha Moore committee/inviter row and a pending committee invite row.
5. **2026-07-22 20:59 UTC** — Anita’s invitation was relinked from the wrong committee record to Aisha Moore.

**Why she “disappeared”**
- Based on the live audit log, **Aisha Moore was not deleted**.
- The failure was that **Aisha Moore was never successfully stored as her own uploaded guest/contact record** in the first place.
- Her name existed only as **free text** on another person’s RSVP, so the Committee Guests page had nothing solid to display until a real Aisha Moore row was created.
- When you later asked for her to be committee, the normal committee-add flow needs a phone number or an existing guest row with a phone. Since there was **no Aisha guest row**, the name-only resolution had nothing to resolve from.

**Plan if you approve repair work**
1. **Make Aisha’s committee record complete**
   - Add/confirm Aisha Moore’s phone number before changing login-capable committee access.
   - Link her committee invite, inviter row, and any guests she invited under the same person record.

2. **Prevent this exact failure going forward**
   - When an RSVP says “invited by Aisha Moore,” require the system to resolve that name to an actual inviter/committee/contact row instead of leaving it as loose text.
   - If there is no exact match, show an admin review item instead of silently leaving it unlinked.

3. **Add an Aisha-only audit note/export**
   - Produce a shareable one-page CSV/PDF showing the timeline above and the exact rows involved, without bringing in unrelated deleted people.