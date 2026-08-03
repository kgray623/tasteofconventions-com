/**
 * Reliable text/CSV download for phones and framed previews.
 *
 * The naive pattern (create a Blob, click a hidden anchor in the current
 * document, revoke the URL immediately) is silently dropped by mobile Chrome
 * when the app is running inside an iframe, and the instant revoke can abort
 * slow mobile downloads. This helper:
 *   - anchors the click into the top-level document when we're framed,
 *   - keeps the object URL alive long enough for the download to start,
 *   - reports success/failure so the caller can show a fallback.
 */

export type DownloadResult = { ok: true } | { ok: false; reason: string };

function topDocument(): Document {
  try {
    const top = window.top;
    if (top && top !== window && top.document) return top.document;
  } catch {
    // Cross-origin parent (published site embedded elsewhere) — use our own doc.
  }
  return document;
}

export function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/csv;charset=utf-8",
): DownloadResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, reason: "Downloads are only available in the browser." };
  }
  if (!text.trim()) {
    return { ok: false, reason: "There is nothing to download yet." };
  }

  let url: string | null = null;
  try {
    const blob = new Blob([`\uFEFF${text}`], { type: mime });
    url = URL.createObjectURL(blob);

    const doc = topDocument();
    const a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.position = "fixed";
    a.style.left = "-9999px";
    (doc.body ?? doc.documentElement).appendChild(a);
    a.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: doc.defaultView ?? window }),
    );
    a.remove();

    const held = url;
    window.setTimeout(() => URL.revokeObjectURL(held), 60_000);
    return { ok: true };
  } catch (e) {
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "This browser blocked the download.",
    };
  }
}

/** Opens the text in a new top-level tab so mobile users can save or share it. */
export function openTextInNewTab(text: string, mime = "text/csv;charset=utf-8"): DownloadResult {
  try {
    const blob = new Blob([`\uFEFF${text}`], { type: mime });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (!win) return { ok: false, reason: "The browser blocked the new tab." };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "The browser blocked the new tab.",
    };
  }
}

export async function copyText(text: string): Promise<DownloadResult> {
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Copying was blocked." };
  }
}
