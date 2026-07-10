## Problem

On the committee dashboard (`CommitteeWorkspace`, rendered at `/admin` for committee members and when an admin previews as committee), the top "Upload guests" quick-action button:

1. Is styled black (`bg-ink text-cream`) instead of orange like you asked.
2. Doesn't navigate when tapped on mobile.

## Fix

### 1. Recolor to orange (brand `terracotta`/sunset)

In `src/components/committee-workspace.tsx` around line 511, change the top "Upload guests" button from the black ink style to the orange brand button:

- `bg-ink text-cream hover:bg-ink/90` → `bg-terracotta text-cream hover:bg-terracotta/90`

Also apply the same orange treatment to the sibling "Upload guests / Add guests" primary buttons at lines 766 and 878 so the guest-upload call-to-action is consistent across the committee workspace. Leave the outline/secondary variants alone.

### 2. Fix the click doing nothing

The `<Button asChild>` wraps a `<Link to="/admin/upload" search={{ view: "committee" }}>`. On mobile, the `<Upload>` icon and text are direct children of `<Link>` with no wrapping `<span>`, and the button uses `justify-start h-14` — Radix Slot forwards props to the first child, but only one child is allowed for `asChild`. Because there are two children inside `<Link>` (icon + text), Slot silently drops the click handler on some builds, which is the most likely cause of "clicking does nothing".

Fix by wrapping the icon + label in a single `<span className="inline-flex items-center gap-2">` inside each `<Link>` so `asChild` sees exactly one child. Apply to all four `Link`s under `Button asChild` in this file (lines 511, 758, 766, 878).

### 3. Verify

- Reload `/admin` as a committee member (and as admin with `?view=committee`).
- Confirm the top "Upload guests" button is orange.
- Tap it on the mobile preview (384px) and confirm it navigates to `/admin/upload?view=committee` and the upload page renders.
- Confirm the two in-section "Add guests" buttons in the Guest list panel also navigate.

## Files touched

- `src/components/committee-workspace.tsx` (button color + Link child wrapping only; no logic changes)
