Update the "Pre-order your cultural meal" section copy in the three places it appears:

1. **src/routes/rsvp.index.tsx** — `/rsvp` public RSVP page
2. **src/routes/rsvp.$token.tsx** — `/rsvp/:token` invited-guest RSVP page
3. **src/components/my-rsvp-content.tsx** — `/my-rsvp` dashboard for logged-in guests

Changes to apply in all three locations:
- Change heading from `Pre-order your cultural meal` to `Pre-order your catered cultural meal`.
- Replace the paragraph below it with:
  > Cultural meals are in the twenty to thirty dollar range per meal. Each cuisine offers a beef or a chicken meal, and all meals are gluten-free. When you click below to make a pre-order, we will soon provide the menu option and the restaurant that you will contact direct to pay for your meal in advance.

No other UI, logic, or database changes are required.