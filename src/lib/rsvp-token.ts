/** Tolerant RSVP token variants (URL encoding can mangle + and /). */
export function rsvpTokenCandidates(token: string) {
  const trimmed = token.trim();
  return Array.from(
    new Set(
      [trimmed, trimmed.replace(/ /g, "+"), trimmed.replace(/-/g, "+").replace(/_/g, "/")].filter(
        Boolean,
      ),
    ),
  );
}
