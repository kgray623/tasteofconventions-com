The "Invited by" dropdown currently shows placeholder text "Select who invited you" and the first alphabetical inviter (e.g., "Carrie Gray") can appear pre-selected if the user had previously selected it and the value was restored from draft state. The user wants a clearer empty default state.

Changes in both `rsvp.index.tsx` and `rsvp.$token.tsx`:

1. Change the `SelectValue` placeholder from "Select who invited you" to "Open to select" so the empty state is unmistakable.
2. Add a disabled first `<SelectItem value="" disabled>Open to select</SelectItem>` inside `<SelectContent>` as a visual placeholder option at the top of the list.

This keeps the existing validation (toast error if nothing is selected on submit) and preserves all other RSVP logic untouched.