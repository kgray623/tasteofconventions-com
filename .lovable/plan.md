# Make the Text button actually open Messages

2026-08-06 05:5x UTC

## What your screenshot proves

The popup you're seeing ("Messages didn't open… This browser blocked the text link") is the app
correctly reporting that the tap was blocked. It is blocked because you are tapping it **inside the
Lovable app's built-in preview window** (the screenshot shows the Lovable Chat / mic / Publish bar at
the bottom). That preview is an embedded webview, and embedded webviews refuse to hand off `sms:` to
the phone's Messages app — no code inside the page can override that. The same button on the real
site in Chrome does open Messages.

So there are two things to fix, and only one of them is code:

1. Committee members must never be tapping Text inside the Lovable preview.
2. The page should say that plainly and give a one-tap way out, instead of a popup that reads like the
   feature is broken.

## What will change

**A. "Open in your phone's browser" escape hatch**
When the page detects it is running inside a frame/webview (which is what the preview is), it shows a
prominent bar at the top of both meal-text pages:

> Texting can't open Messages from inside this preview. Tap **Open on tasteofconventions.com** — then
> your Text buttons work.

The button opens `https://tasteofconventions.com/admin/meal-texts-mine` at the top level, outside the
preview. This is the actual working path for you and for Mysha and Tina.

**B. Android intent fallback before giving up**
Before showing the failure popup, the button tries, in order:
- the plain `sms:` link (works in Chrome/Safari)
- `intent://…#Intent;scheme=smsto;end` (Android's own handoff, works in more webviews)
- only then the copy/paste popup

**C. Rewrite the popup wording**
Instead of "Messages didn't open / this browser blocked the text link", it becomes:
"You're in the Lovable preview — Messages can't open here." with **Open on tasteofconventions.com**
first, then **Copy message**. The message text stays exactly as-is so nothing is lost.

**D. No change to tracking**
"Texted" still only gets set when a human taps "Check here after you text". Nothing marks itself.

## Verification before I say it's fixed

- Real headless browser at 384px, top-level (not framed): tap **Text Kari** on
  `/admin/meal-texts-mine` and confirm an actual `sms:+1808…?body=Hi Kari — …` navigation is
  attempted, with the full Lalibela message.
- Same page loaded inside an iframe: confirm the escape-hatch bar appears and the popup now leads with
  the "open on the real site" button.
- Then you test it once on your own phone in Chrome (not in the Lovable app), and I'll only call it
  done after you confirm.

## Technical notes

- `src/lib/meal-text-message.ts`: add `isEmbedded()` and an `intent://` attempt inside `openSms`.
- `src/components/sms-text-button.tsx`: new wording, "Open on tasteofconventions.com" action.
- New small banner component rendered on `src/routes/_authenticated/admin/meal-texts-mine.tsx` and
  `src/routes/_authenticated/admin/meal-texts.tsx`.
- No database, referral, restaurant or RSVP changes.
