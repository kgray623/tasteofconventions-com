## Add two new FAQ items to the invitation page

Edit `src/components/invitation-page.tsx` and add two new `AccordionItem` entries at the end of the FAQ accordion (after "May children attend?", before `</Accordion>`). Also add matching icon imports from `lucide-react` (e.g. `UserPlus` and `Pencil`).

### 1. "Can I invite my friends?"

Content:
- First, make sure the friends you'd like to invite are spiritually qualified and in good standing.
- Then have them text **VOLUNTEER** along with their name to **808-278-7562**.
- We'll add them to the committee and change their status.
- Once they log in, a welcome video will walk them through how the platform works.
- Important: they should upload their contacts first so we can check that the people they want to invite haven't already been invited by someone else.

### 2. "What if I need to change my RSVP?"

Content:
- It's simple — just log in and update your RSVP.
- You can add or remove meals, change your guest count, switch between in-person and Zoom, or make any other modifications.
- Include a "Log in" button linking to `/login`.

### Notes
- Purely a content/UI change to one file. No schema, no server functions, no auth changes.
- Keep styling consistent with existing accordion items (same border/rounded/px classes, `text-sunset` icons, `text-muted-foreground` body).
- No changes to tabs array at the top — those are the quick-jump tabs above the fold and the user didn't ask to surface these there.
