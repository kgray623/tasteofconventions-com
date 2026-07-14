export function normalizeCuisine(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("myanmar") || lower.includes("burmese")) return "Myanmar";
  if (lower.includes("african") || lower.includes("mozambique")) return "African";
  if (lower.includes("indonesia") || lower.includes("jakarta")) return "Indonesian";
  return raw.trim() || "Other";
}

export function parseSelections(selections: unknown): { cuisine: string; qty: number }[] {
  if (!Array.isArray(selections)) return [];
  const out: { cuisine: string; qty: number }[] = [];
  for (const item of selections) {
    if (!item || typeof item !== "object") continue;
    const raw = String(
      (item as { cuisine?: unknown; country?: unknown }).cuisine ??
        (item as { cuisine?: unknown; country?: unknown }).country ??
        "",
    );
    const qty = Number((item as { qty?: unknown; quantity?: unknown }).qty ?? (item as { qty?: unknown; quantity?: unknown }).quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    out.push({ cuisine: normalizeCuisine(raw), qty: Math.round(qty) });
  }
  return out;
}