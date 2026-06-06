Rhonda Wilcher already has the same access path as every other committee member — no further changes needed.

## How committee access works today
- `team_invites` row exists for Rhonda (added last turn, role = `team`).
- On her first phone-only sign-in, the `apply_team_invite` trigger grants `user_roles.role = 'team'`.
- Committee permissions everywhere in the app are gated by `has_role(auth.uid(), 'team')` — identical to all other committee members.

## Options if you want her access active before she logs in
1. **Do nothing** (recommended) — she gets full committee access automatically on first sign-in via her phone.
2. **Pre-provision** — if she already has an auth user (has signed in before), insert a `user_roles` row with `role='team'` for her user id so access is live immediately.

Tell me which you want; if option 2, confirm and I'll check whether she has an auth account and add the role.