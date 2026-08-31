// Browser-safe photo-album announcement wording. Kept out of *.server.ts so the
// page and the server helper share one default and one renderer.

export const DEFAULT_ALBUM_TEXT_TEMPLATE = `Hi {name} — what a special day at A Taste of Special Conventions!

Our photo & video sharing album is now open. Everyone who was with us, in person or on Zoom, can add their pictures and videos and save everyone else's too.

How to use it:
1. Go to tasteofconventions.com and log in (username = your last name, password = your phone number).
2. At the top of your page you'll see "Share Your Photos."
3. Tap Add photos/videos to upload, tap any photo or video to view it full screen, and tap Save to download it to your phone.
4. You can also like and comment on each other's memories.

720p videos: about 10-15 minutes. 1080p videos: about 5-7 minutes.

Thank you for making this day so encouraging!

Christian love,
Taste of Conventions Committee`;

/** Fill {name} (first name) and {fullName}/{guest} in the announcement template. */
export function renderAlbumText(template: string, guestName: string) {
  const full = (guestName ?? "").trim();
  const first = (full.split(/\s+/)[0] ?? "").replace(/[,;:.]+$/, "");
  return (template || DEFAULT_ALBUM_TEXT_TEMPLATE)
    .replaceAll("{name}", first || full || "there")
    .replaceAll("{guest}", full || first || "there")
    .replaceAll("{fullName}", full || first || "there");
}
