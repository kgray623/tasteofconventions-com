Trim the Committee tab (`/admin/inviters`) to just two cards.

## Remove from src/routes/_authenticated/admin/inviters.tsx

1. **Committee members description text** — remove the paragraph "Anyone flagged as committee on the guest list appears here so the whole team can see who's on board." and the "{count} committee member(s)" line under it. Keep the heading "Committee members" and the roster grid below.
2. **Committee communication card** (the chat panel, lines ~673–729) — duplicated by Committee SMS.
3. **Committee needs card** (lines ~732–782) — duplicated by Volunteer.
4. **Upload your contacts to invite card** (lines ~784–856) — duplicated by Add guests.
5. **Add Steering Committee Member form** (admin branch, lines ~862–905) AND the non-admin "Nominate" fallback (lines ~907–917) — duplicated by Add Team tab.
6. Collapse the now-empty `<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">` wrapper (lines ~671, 858).

## Keep

- Committee members roster card (heading + grid only).
- Pending RSVP quota requests card.
- Steering committee invitations & usage table.

## Cleanup of unused code

Remove now-unused state, refs, effects, handlers, and imports:
- State: `msgs`, `messageBody`, `cats`, `assigns`, `events`, `eventId`, `contacts`, `savingContacts`, `name`, `email`, `phone`, `quota`, `adding`, `screenshotBusy`, `fileRef`, `chatScrollRef`.
- Handlers/effects: `sendMessage`, `assignmentLabel`, `parseContactFile`, `saveContacts`, `fileToDataUrl`, `onScreenshots`, `add`, `parseVCards`, `pickContactField`, the realtime `team_messages` subscription effect, the chat scroll effect, the `inviteTeamMemberFn`/`extractContactsFn` server fns.
- Load: drop the `team_messages`, `profiles`, `categories`, `category_assignments`, `events` queries and the auto-create-inviter-for-committee block; keep `inviters`, `invitations`, `rsvps`, `team_invites`, and the committee-flagged invitations query (still needed for the Committee members roster, the pending quota card, and the invitations table).
- Imports: drop `Papa`, `useServerFn`, `useRef`, `Textarea`, `inviteTeamMember`, `extractContactsFromImages`, unused icons (`FileUp`, `MessageSquare`, `Plus`, `UserPlus`, `Send`, `Upload`, `ListChecks`).

No other tabs/pages change; the deleted features still live at Committee SMS, Volunteer, Add guests, and Add Team.
