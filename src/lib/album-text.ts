// Browser-safe photo-album announcement wording. Kept out of *.server.ts so the
// page and the server helper share one default and one renderer.

export const DEFAULT_ALBUM_TEXT_TEMPLATE = `Hi {name} — what a special day A Taste of Special Conventions was for all of us who were there live and virtually!

We now have a photo & video sharing album. (Please don't share on social media any Indonesia segment pictures from the videos for the safety of friends there from banned countries.)

Please share your photos or videos in this secure private photo album.

How to use:

1. Go to tasteofconventions.com and log in (username = your last name, password = your phone number).
2. At the top of your RSVP page you'll see "Share Your Photos."
3. Tap Add photos/videos to upload. Tap on any photo or video to view it full screen. There you can save to download to your device.
4. You can like and comment on each other's memories.

720p videos: about 10-15 minutes. 1080p videos: about 5-7 minutes.

Thank you for making this day so very special, fun, amazing and encouraging!

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
