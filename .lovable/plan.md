## Add NEW arrow to the Last name field on /login

The login page already shows a **Last name** input above the phone field. I'll add the bright red NEW → badge next to its label so returning users notice the field is new.

- **Edit** `src/lib/whats-new.ts` — add `"login:last-name": { addedAt: "2026-06-16" }`.
- **Edit** `src/routes/login.tsx` — import `NewBadge` + `markSeen`; render `<NewBadge target="login:last-name" />` inline next to the **Last name** `<Label>` (in a flex row); call `markSeen("login:last-name")` on the input's first focus so it disappears once they interact.

No other changes.
