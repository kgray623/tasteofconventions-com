## Goal

On the committee page, when the **Guest list / Add guests** section is expanded, put an **Add guests** button at the very top of the opened content — not just in the collapsed section header. The header button and the bottom-of-page button both stay where they are.

## Change

File: `src/components/committee-workspace.tsx` (the `CollapsibleSection` currently at lines 752-763 that titles "Guest list").

Inside that section body (right at the top, before the loading / empty / list branches around line 765), render a full-width row containing an **Add guests** button that links to `/admin/upload?view=committee` — identical target to the existing header and footer buttons, styled to be clearly visible as the first thing in the opened section.

```tsx
<div className="p-4 border-b border-border flex justify-end">
  <Button asChild className="bg-ink text-cream hover:bg-ink/90">
    <Link to="/admin/upload" search={{ view: "committee" }}>
      <Upload className="w-4 h-4 mr-2" /> Add guests
    </Link>
  </Button>
</div>
```

Nothing else changes:
- The header-row `action` button stays (visible even when collapsed).
- The bottom-of-page "Guest list / Add guests" button stays.
- No routing, data, or business-logic changes.

## Verify

Sign in as a committee member on mobile (384x673, the viewport you're using), expand the **Guest list** section, confirm the **Add guests** button is the first thing visible in the opened body and navigates to `/admin/upload`. Include the UTC timestamp in the closing update.

## Not changing

- Quota restores — the 5 recorded requests (Kari 51, Shelley & Pat 40, Dixie 30, Betsaida 30, Jamy 5) remain intact; no further restores exist in the audit trail.
- The top-of-page committee buttons above the welcome video (Upload guests / Add one guest) are already present and stay.
