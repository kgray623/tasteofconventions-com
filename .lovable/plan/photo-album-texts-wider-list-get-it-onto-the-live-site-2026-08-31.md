# Photo album texts: wider list + get it onto the live site

Timestamp: 2026-08-31 20:12 UTC

## What the database actually shows

- 248 is exactly the number of invitations with an RSVP of **yes or maybe** (135 in person, 113 Zoom). That is what the page is currently built on.
- There are **205 more invitations that never submitted an RSVP at all** — they are neither attending nor declined, so the page silently skips them. All 205 have a phone number on file.
- 169 invitations declined (RSVP "no").
- Attending + never-responded = 453 records, **446 distinct phone numbers**.

So nothing is missing from the database; the list is simply filtered to confirmed yes/maybe.

## Second screenshot (the live site)

The "Photo album texts" tab **does** exist in the current code and shows in the Lovable preview (first screenshot). It is absent in the browser screenshot because the **published site is still running the older build** — the album-texts page was added after the last publish.

## The fix

1. Widen the album-texts list to everyone who could have been there:
   - RSVP yes/maybe (as now), **plus** invitations with no RSVP response.
   - Declined (RSVP "no") stays excluded.
   - Duplicate phone numbers collapse to one row so nobody gets two texts, and the badge counts real people, not rows.
2. Group headers stay by committee member, and each guest row shows a tag: **In person**, **Zoom**, or **No reply**, so you know who you are texting.
3. Header counts update to: total people, in person, Zoom, no reply, still to text, no phone on file.
4. Existing "Mark sent" history is untouched — nothing already marked is lost or reset.
5. **Publish** so the tab and the wider list appear on tasteofconventions.com.

## Technical detail

- `src/lib/album-texts.server.ts`: change the RSVP join from "status in (yes, maybe)" to "status is null or status in (yes, maybe)", carry an `audience` field (`in_person` / `zoom` / `no_reply`), and de-duplicate by normalized phone (keeping the record with an RSVP over a bare invitation).
- `src/routes/_authenticated/admin/album-texts.tsx`: render the new tag and the extra header badges. Wording template unchanged.
- `src/hooks/use-album-texts.ts` / admin nav badge pick up the new total automatically.
- No schema change; `album_text_sends` keeps working per invitation id.

## Verification before reporting done

- Direct database counts for the new filter compared against the page totals, exact match required.
- Playwright at 390x844 signed in as admin on `/admin/album-texts`: confirm the new count, the audience tags, one row per phone, and a real `sms:` link body.
- Mark sent / undo on one row with database read-back, then removed, zero leftover rows.
- After publishing, load the live site and confirm the "Photo album texts" tab is present there too.
