## Goal
Add a new FAQ accordion item on the public landing page (`/`) under the existing "Tap to open" section, with two bullet points:
1. Only those in good standing in the congregation are invited.
2. Children and young people are encouraged to attend who are behaved with their parent or guardian.

## Implementation
1. **Update `src/components/invitation-page.tsx`**
   - Import a suitable icon (e.g., `Users` from `lucide-react`) alongside the existing icon imports.
   - Insert a new `<AccordionItem value="attendance" id="attendance">` inside the existing `<Accordion>` block, placed logically with the other FAQ items.
   - Use the same styling pattern as existing items: trigger label with icon + "Attendance / Eligibility", content with the two bullet points in `text-muted-foreground`.

2. **No other files need changes.** This is a presentation-only content addition; no data fetching, routes, or backend updates are required.

## Verification
- Run `tsgo --noEmit` to confirm the new import and JSX typecheck cleanly.
- Visually confirm on the preview at `/` that the new accordion item appears and opens correctly, and that the two points read as requested.

## Notes
- The new item will be collapsible like all other FAQ items, controlled by the existing `openItems` state.
- No metadata or route head changes are needed for this content-only update.