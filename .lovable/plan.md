On the landing page FAQ, the single "Attendance" accordion currently combines the two ideas. Split it into two distinct accordion items and update the wording per the user's request.

Changes to `src/components/invitation-page.tsx`:

1. Replace the single "Attendance" `AccordionItem` with two items:

   - **"Who may attend?"**
     - Trigger icon: keep `Users` (or a suitable alternative from the existing icon set).
     - Content:
       `Those who have been invited, are in good standing in the congregation, and have RSVP'd may attend. Attendees must have been personally invited by someone on our committee.`

   - **"May children attend?"**
     - Trigger icon: choose a child/family-friendly icon from the existing `lucide-react` imports if available, otherwise reuse `Users`.
     - Content:
       `We encourage children and young people to attend who are with a parent or guardian, are well-behaved, and have RSVP'd.`

2. Keep the same styling pattern as the other FAQ items (`border border-border rounded-2xl bg-card px-5`, trigger with icon + label, content `text-muted-foreground`).

3. Verify the `Users` icon is already imported; if a second icon is added, import it from `lucide-react`.

No other files need changes. After implementation, verify by opening the landing page FAQ section and confirming the two tabs are separate and contain the updated text.