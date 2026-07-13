## Fix "Send text" button on Committee → Pending

### Problem
On `/admin?view=committee`, the newly added "Send text" button in the Pending list doesn't launch the phone's Messages app when tapped. The equivalent button on `/admin/upload` (Send SMS) works. The two differ in one meaningful way: upload uses a plain `<a href="sms:...">`, while the committee button wraps the anchor in `<Button asChild>`. Radix's Slot can interfere with `sms:` navigation on some Android WebViews (including the Lovable mobile app WebView), which matches the reported symptom.

### Change
File: `src/components/committee-workspace.tsx` (Pending row render, ~lines 1176-1192)

Replace the `<Button asChild><a href={href}>…</a></Button>` block with the same raw anchor pattern used on the upload page — identical styling and identical `sms:` href builder that already lives in this file (`buildSmsHref`). No other files touched.

```tsx
{buildSmsHref && (() => {
  const href = buildSmsHref(guest);
  if (!href) return null;
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-terracotta text-cream text-xs font-medium hover:bg-terracotta/90"
    >
      <MessageSquare className="w-4 h-4" /> Send text
    </a>
  );
})()}
```

### Out of scope
- No changes to sort control, quotas, RSVP flow, DB, or admin pages.
- Not adding auto "mark as sent" here (upload page does that; committee flow doesn't track `invite_sent_at` in this query). Can add later if requested.

### Verification
1. Sign in as a committee user on mobile, open `/admin?view=committee`.
2. Expand Pending, tap "Send text" on a guest with a phone.
3. Confirm the phone's Messages app opens with recipient + prefilled body.
4. Screenshot via Playwright to confirm the anchor renders with correct `href="sms:..."`.
