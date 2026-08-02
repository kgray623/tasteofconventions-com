# Tina Santana Referral Reconciliation

**Rule:** Every referral you provided from Tina’s 12 screenshots belongs to Tina **unless the same guest/household was already loaded for another committee member first**. Existing first ownership wins. No guessing and no moving first-loaded guests.

## 1. Reconstruct Tina’s complete source list
- Combine every Tina list previously supplied: the two confirmed upload batches, the first handwritten/SMS group, and the second handwritten list.
- Build one authoritative working roster containing each supplied name/household and phone number.
- Preserve household entries exactly as submitted; do not split, merge, rename, or discard them unless your screenshot explicitly supplies a correction such as **Selina Neizer**.
- Report two totals separately:
  - referral/household records;
  - named people represented by those records.

## 2. Match every entry against the database
- Match primarily by normalized phone number, including country-code and punctuation differences.
- Use names only to flag possible matches for manual review; never transfer ownership from a name-only guess.
- For every Tina entry, classify it as:
  1. already credited to Tina;
  2. first loaded under another committee member, with that owner and original load date;
  3. present but uncredited;
  4. genuinely missing.
- Detect duplicate database rows sharing the same normalized phone so one household is not counted twice.

## 3. Apply first-loaded-wins correctly
- Keep every guest already loaded first by Shelley/Pat Monaghan, Kari Gray, Mysha Woods, Betsaida Ruiz, or another committee member with that original owner.
- Credit every uncredited matching row from Tina’s supplied lists to Tina.
- Add **every genuinely missing Tina referral**, not merely the four previously identified, with Tina’s `inviter_id`, a valid RSVP token, pending RSVP state, and not-yet-texted state.
- Preserve all existing RSVP responses, party sizes, meal preorders, sent dates, notes, and guest information.
- Apply the explicit Selina surname correction without changing her referral ownership or related submissions.

## 4. Protect tracking permanently
- Change automatic RSVP referral linking so it may populate an empty referral only; it must never overwrite a non-null first-loaded committee owner.
- Keep explicit admin corrections possible through the audited admin path.
- Record the permanent project rule: **referral ownership is assigned from the committee member’s submitted list; normalized-phone first-loaded ownership wins; duplicates never transfer ownership; no referral association is guessed or overwritten from RSVP text.**

## 5. Prove the result end to end
- Read back every source-list entry and produce a reconciliation table showing: submitted name, phone, database name, status, credited committee member, original load date, and action taken.
- Confirm Tina’s final totals for both referral records and represented people.
- Verify Tina’s exact committee dashboard on the mobile viewport shows all referrals credited to her and does not show first-loaded referrals belonging to others.
- Verify the admin Committee Guests view shows the same ownership and counts.
- Confirm no RSVP, meal preorder, guest submission, or other committee member’s first-loaded referral was removed, hidden, or overwritten.

**Timestamp:** 2026-08-02 18:14 UTC