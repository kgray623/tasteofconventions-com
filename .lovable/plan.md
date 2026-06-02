I found the issue: `/admin/upload?view=committee` is showing a placeholder that says “A short video will be placed here…” instead of the real walkthrough video.

Plan:
1. Update `src/routes/_authenticated/admin/upload.tsx` so the top walkthrough area embeds the existing Wistia video currently used by the committee workspace: `https://fast.wistia.net/embed/iframe/cf8d380y2y?videoFoam=true`.
2. Keep the existing page layout and quota cards unchanged.
3. Add the same iframe attributes used elsewhere so it can play fullscreen and render responsively on desktop and mobile.
4. Remove the unused placeholder-only `PlayCircle` import if it’s no longer needed.
5. Verify the upload page shows the real video area instead of the placeholder.