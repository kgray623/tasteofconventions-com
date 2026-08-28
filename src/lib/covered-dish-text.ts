// Browser-safe covered-dish reminder wording. Kept out of *.server.ts so both
// the page and the server helper can share one default and one renderer.

export const DEFAULT_COVERED_DISH_TEMPLATE =
  "Hi {name}! Just a reminder regarding the Taste of Conventions event Sunday at 4 pm - please bring a covered dish to share with brothers and sisters 😊. Thank you. See you Sunday!";

/** Fill {name} (first name) and {fullName}/{guest} in the reminder template. */
export function renderCoveredDishText(template: string, guestName: string) {
  const full = (guestName ?? "").trim();
  // Strip trailing punctuation so a stored "Dan, Amanda" renders as "Dan".
  const first = (full.split(/\s+/)[0] ?? "").replace(/[,;:.]+$/, "");
  return (template || DEFAULT_COVERED_DISH_TEMPLATE)
    .replaceAll("{name}", first || full || "there")
    .replaceAll("{guest}", full || first || "there")
    .replaceAll("{fullName}", full || first || "there");
}
