## What I'll do

Replace the committee welcome video on `/admin/subcommittee` with the Wistia video at `https://kgray623.wistia.com/s/f9qhjpbaheea3in`.

## Steps

1. Fetch the Wistia share page to resolve the current media hashed ID for share link `f9qhjpbaheea3in`.
2. Update the embed URL in `src/components/committee-workspace.tsx` to `https://fast.wistia.net/embed/iframe/<mediaId>?videoFoam=true`.
3. Verify on `/admin/subcommittee` via Playwright with an authenticated committee session that the iframe loads with no Wistia errors.
4. Report result with a UTC timestamp.

## Note

This is the same Wistia link you sent yesterday, which I already wired in (resolved to media ID `yh941jrk2g`). If it's still not playing for you, tell me what you see (blank area, "video not found", spinner) and I'll dig deeper instead of re-applying the same change.
