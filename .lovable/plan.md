# FAQ Food Section Update

## Goal
Replace the current Food accordion copy on the public landing page with the full food-options wording provided by the user, including dietary guidance and meal-quality statements.

## Change
- File: `src/components/invitation-page.tsx`
- Location: the `Food` AccordionItem (around line 412-424).
- Replace the existing single paragraph with:

```
Food options are bringing a dish to share with others or ordering a catered meal paid directly to the restaurant for the authentic Taste of Special Conventions experience.

If you have special dietary needs for medical conditions, we invite you to bring your meal to the event.

All meals are gluten-free, msg free, and seed oil free using only butter or tallow.
```

## Verification
- Build the project to confirm no JSX/TypeScript errors.
- Open the preview at mobile width, expand the Food accordion, and confirm the new three-paragraph text renders correctly.
