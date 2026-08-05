export function friendlyDbError(
  context: string,
  err: { message?: string | null } | null,
): Error {
  const raw = err?.message ?? "";
  if (/permission denied|not authorized|rls/i.test(raw)) {
    return new Error(`You don't have access to ${context}. Sign in again or ask an admin.`);
  }
  if (/timeout|network|fetch failed/i.test(raw)) {
    return new Error(`Couldn't reach the database while loading ${context}. Please retry.`);
  }
  return new Error(`Couldn't load ${context}. ${raw || "Please try again."}`.trim());
}