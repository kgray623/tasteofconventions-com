# Stabilize security, reliability, and Zelle payments

**Plan timestamp:** 2026-08-11 05:40 UTC

## Confirmed current state

- The current persisted security scan, database linter, dependency scan, and Project monitoring list report no active findings; the screenshot shows eight previously ignored warnings, which remain visible in the ignored section.
- The hosted backend is responding normally.
- All three active restaurants have a saved recipient name, phone number, QR image, and official `enroll.zellepay.com` URL.
- Those official Zelle URLs are bank-selector handoffs. A website cannot force an unknown banking app to open directly on a completed recipient payment screen; Zelle and the guest’s bank control that final step.
- The application currently presents the official URLs as tappable QR images and **Open in Zelle** buttons, while older text-rendering logic deliberately suppresses direct-payment links because the destination is not universally direct.

## Work

### 1. Reopen and resolve the eight ignored security warnings

- Ask you to restore the eight ignored rows from the Security tab so each can be tracked as an active finding again; ignored findings cannot be restored programmatically.
- Match every restored finding to its exact database policy, function permission, storage rule, or server action.
- Replace broad public access with narrow server-mediated or role-scoped access wherever possible.
- Preserve intentional public RSVP and restaurant entry points while preventing phone-number enumeration, cross-guest reads, unauthorized writes, and privileged-client bypass.
- Move extensions or executable functions out of exposed paths where safe, revoke unnecessary execution rights, and retain only the minimum grants required by the real app.
- Mark only findings proven corrected as fixed. Do not hide or re-ignore unresolved findings.

### 2. Complete a code-level security hardening pass

- Audit every privileged database-client import and require caller authorization before loading or using it.
- Make every role check fail closed on database errors as well as missing roles.
- Review guest RSVP lookup, last-name/phone login, restaurant phone login, uploads, exports, payment reporting, deletion/archive, and public API routes for rate limiting, enumeration resistance, input validation, and data minimization.
- Keep submitted guests, RSVPs, meals, payments, audit records, and deleted-row archives intact and visible to authorized roles.
- Keep server-function files transform-safe by moving runtime helpers/constants into server-only modules or handler bodies where required.

### 3. Remove real runtime and dependency problems

- Run the current security, dependency, database-linter, application-monitoring, lint, type/build, and runtime checks after the fixes.
- Correct actionable warnings and errors at their source rather than suppressing console output.
- Review recent backend/auth error logs and distinguish harmless historical migration notices from current failures.
- Add focused regression coverage for identity, RSVP persistence, meal accounting, payment authorization, restaurant actions, and protected exports.

### 4. Make the Zelle flow as direct and honest as technically possible

- Validate each restaurant’s saved QR payload against its recipient name and phone:
  - Lalibela / African — Senait T Gebremichael — 402-939-9093
  - Koen / Indonesian — Inez Retnosari — 402-853-2509
  - Burmese / Myanmar — Asian Burmese Restaurant / Kawnnan — 310-595-6907
- Use one shared payment component on every guest RSVP, preorder, and cuisine meal surface so no route can point to the wrong restaurant.
- Keep the QR tappable and provide the official Zelle handoff as the primary action only with accurate wording such as **Open Zelle payment options**—not a promise of one-tap payment.
- Provide the shortest reliable fallback on the same screen: recipient name, copyable phone number, amount, memo instruction, and enlargeable QR for scanning from another device.
- Remove contradictory legacy helpers and text templates so SMS, Admin, Committee, RSVP, and meal pages all describe the same workflow.
- If device testing proves a bank-specific URL opens directly for a supported bank, preserve that progressive enhancement while keeping the universal fallback. Do not fabricate an unsupported deep link or claim the bank-controlled step is bypassed.

### 5. End-to-end verification before reporting completion

- Security: rerun all scanners and the database linter; confirm no active error/warning remains. If a warning is structurally unavoidable, leave it active and explain the exact limitation rather than hiding it.
- Authorization: test anonymous, Guest, Committee, Admin, and Restaurant roles against their real routes and verify denied cross-role access.
- Data integrity: perform writes through the real UI/server actions and read back RSVP, meal, payment, audit, and ownership records without deleting or overwriting submitted information.
- Zelle: at the actual 384 × 681 mobile viewport, test African, Indonesian, and Myanmar on the public/token RSVP, signed-in RSVP, preorder, and cuisine routes; inspect the exact outgoing URL and confirm the recipient mapping never crosses restaurants.
- Payment tracking: test guest-reported payment, Committee/Admin verification views, and Restaurant paid/confirmed actions with database read-back.
- Reliability: verify primary public and protected routes, console output, network failures, responsive layout, and generated SMS content.
- Provide a timestamped final report separating: verified corrections, verified role/device coverage, remaining third-party Zelle limitations, and anything that could not be verified.

## Important limitation

No web application can guarantee that tapping a Zelle URL skips directly into every guest’s banking app and opens a ready-to-send payment. There is no universal public Zelle deep-link contract for that behavior. This work will implement and verify the shortest supported handoff, but it will not mislabel Zelle’s bank-selection page as direct payment.