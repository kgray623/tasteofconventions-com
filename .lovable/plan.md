## Fix

On `/login`, the NEW badge currently renders to the **right** of the "Last name" label, so its right-arrow points into empty space.

Swap the order inside the flex row in `src/routes/login.tsx` (lines 159–162) so the badge comes first and the label comes second:

```tsx
<div className="flex items-center gap-2">
  <NewBadge target="login:last-name" />
  <Label>Last name</Label>
</div>
```

That's the entire change — no other files touched.
