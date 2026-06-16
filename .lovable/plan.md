## Goal

Make in-person headcount visible everywhere a committee member or admin sees an RSVP total, so they always know how many people will physically be in the building.

## Already correct
- `src/components/rsvp-totals-card.tsx` — in-person vs Zoom split + remaining (done last turn).
- `src/routes/_authenticated/admin/index.tsx` — "Confirmed in person / Confirmed on Zoom / Total confirmed" stat rows already split.

## Changes

### 1. Committee workspace (`src/components/committee-workspace.tsx`)
- Add `attendance_mode` to the `GuestRow` type and to the supabase select on line 135 (`rsvps(status,party_size,attendance_mode)`); thread it through the row mapping on lines 144–167.
- Split `confirmedPeople` / `confirmedGuests` into in-person vs virtual:
  - `confirmedInPersonGuests = confirmedGuests.filter(g => g.attendance_mode !== "zoom")`
  - `confirmedVirtualGuests = confirmedGuests.filter(g => g.attendance_mode === "zoom")`
  - Sum `party_size` for each.
- "Confirmed RSVPs" section title becomes `Confirmed RSVPs (X in person · Y virtual / Z responses)`.
- Per-row badge inside the section: if `attendance_mode === "zoom"` show `{party_size} virtual` (different color, e.g. `bg-ink/10 text-ink`); otherwise keep `{party_size} in person` (replacing "attending" copy).

### 2. Admin inviters page (`src/routes/_authenticated/admin/inviters.tsx`)
- Add `attendance_mode` to rsvps select on line 186 and to the `rsvpByInvite` row type / `rsvp_party_size` mapping (extend `GuestRow` with `rsvp_attendance_mode: string | null`).
- `confirmedResponseCount(guests)` becomes in-person-only (`rsvp_status === "yes" && rsvp_attendance_mode !== "zoom"`). This automatically makes the "RSVPs" and "Remaining" columns reflect physical seats — which is what the user asked for, since virtual is unlimited and shouldn't burn quota.
- Rename the column header `RSVPs` → `In-person`. Add a sibling `Virtual` column showing the count of `yes` rows with `attendance_mode === "zoom"` per inviter.
- Update the helper text on line 961 to: "In-person and Remaining reflect seated guests only. Virtual (Zoom) RSVPs are unlimited and don't reduce remaining seats."

### 3. Host dashboard (`src/routes/_authenticated/dashboard.tsx`)
- Pull `attendance_mode` into the `invitations.rsvps(...)` select on line 42 and extend `Invite.rsvps` type.
- Replace the `stats` array on lines 141–147 with:
  - Your invitations
  - Total guest list
  - **Confirmed in person** (yes && not zoom) — emphasized
  - **Confirmed virtual (Zoom)** (yes && zoom)
  - Committee RSVP'd (unchanged, just total)
  - Duplicate flags
- `RsvpBadge` (line 348): when status is `yes`, render two variants — "attending in person" (gold) vs "attending virtual" (ink/cream) — by passing `attendance_mode` alongside `status`.

## Out of scope
- Quota-enforcement server logic (already treats zoom RSVPs as not consuming quota per project memory).
- The 57 vs 52 guest-list discrepancy — separate question, not a number bug here.
