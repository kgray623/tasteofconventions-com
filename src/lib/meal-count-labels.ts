/**
 * The ONLY vocabulary allowed for meal counts anywhere in the app.
 *
 * Three distinct numbers were previously all called "meal orders", which made
 * true numbers look like contradictions. Never label a meal number without
 * using these helpers.
 *
 * - plates      — how many plates the restaurants cook and get paid for.
 * - order lines — one household + one cuisine = one text to send.
 * - households  — how many order forms / families ordered.
 */
export const PLATES_LABEL = "Plates ordered";

export function mealCountSubline(households: number, lines: number) {
  return `${households} household${households === 1 ? "" : "s"} · ${lines} order line${lines === 1 ? "" : "s"}`;
}

export function platesLabel(plates: number) {
  return `${plates} plate${plates === 1 ? "" : "s"} ordered`;
}

export function orderLinesLabel(lines: number) {
  return `${lines} order line${lines === 1 ? "" : "s"} (one text each)`;
}

export function householdsLabel(households: number) {
  return `${households} household${households === 1 ? "" : "s"} ordered`;
}

/** "Read from the database 2026-08-10 13:04 UTC" */
export function readAtUtc(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `Read from the database ${d.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
