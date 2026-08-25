// Browser-safe covered-dish reminder wording. Kept out of *.server.ts so both
// the page and the server helper can share one default and one renderer.

export const DEFAULT_COVERED_DISH_TEMPLATE =
  "Hi {name}! You're on the list for A Taste of Special Conventions — Sunday, August 30, 4:00 PM at Eagle's Landing. Since you're not having a catered meal, please bring a covered dish to share. Thanks so much!";

/** Fill {name} (first name) and {fullName}/{guest} in the reminder template. */
export function renderCoveredDishText(template: string, guestName: string) {
  const full = (guestName ?? "").trim();
  const first = full.split(/\s+/)[0] ?? "";
  return (template || DEFAULT_COVERED_DISH_TEMPLATE)
    .replaceAll("{name}", first || full || "there")
    .replaceAll("{guest}", full || first || "there")
    .replaceAll("{fullName}", full || first || "there");
}
