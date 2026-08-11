/**
 * Zelle hand-off helper + diagnostics.
 *
 * Zelle does not publish a public deep link that pre-fills a payment inside an
 * arbitrary bank app. What we CAN do reliably:
 *  1. copy the recipient phone number to the clipboard at the moment of the tap,
 *     so the guest never has to type or search for the restaurant;
 *  2. try the Zelle app URL scheme, which opens the Zelle/bank app when the
 *     phone has one registered for it;
 *  3. fall back to a sheet with the amount, recipient and a scannable QR when
 *     nothing claims the hand-off — and tell the guest exactly WHY it fell back.
 */

export type ZelleTarget = {
  /** Official Zelle destination URL taken from the restaurant's own QR payload. */
  payLink?: string | null;
  /** Recipient phone number (Zelle token). */
  phone?: string | null;
  /** Recipient name as registered with Zelle. */
  name?: string | null;
};

/** Why an official Zelle hand-off could not be started. */
export type ZelleFailureReason =
  | "opened"
  | "no_pay_link"
  | "unsupported_link"
  | "navigation_blocked";

/** Why the clipboard write did not happen. */
export type ClipboardStatus =
  | "copied"
  | "no_phone"
  | "permission_denied"
  | "insecure_context"
  | "unsupported";

export type ZelleDiagnostics = {
  /** True when the page was backgrounded, i.e. an app took the hand-off. */
  opened: boolean;
  copied: boolean;
  reason: ZelleFailureReason;
  clipboard: ClipboardStatus;
  /** The scheme URL we attempted, if any. */
  attempted: string | null;
  /** Short, guest-readable explanation of what happened. */
  message: string;
  /** What the guest should do next. */
  nextStep: string;
  /** Internal detail for support; never shown as the primary message. */
  detail?: string;
};

/** Best-effort clipboard write with a reason when it fails. */
export async function copyTextWithStatus(
  text: string,
): Promise<{ ok: boolean; status: ClipboardStatus; detail?: string }> {
  const secure = typeof window !== "undefined" ? window.isSecureContext !== false : true;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, status: "copied" };
    }
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    if (!secure) {
      return { ok: false, status: "insecure_context", detail: name };
    }
    if (/NotAllowed|Security/i.test(name)) {
      // fall through to the legacy path, but remember the denial
      const legacy = legacyCopy(text);
      return legacy
        ? { ok: true, status: "copied" }
        : { ok: false, status: "permission_denied", detail: name };
    }
  }
  const legacy = legacyCopy(text);
  if (legacy) return { ok: true, status: "copied" };
  return { ok: false, status: secure ? "unsupported" : "insecure_context" };
}

function legacyCopy(text: string): boolean {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "true");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Best-effort clipboard write. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  const { ok } = await copyTextWithStatus(text);
  return ok;
}

/**
 * Validate and return the restaurant-issued Zelle QR destination unchanged.
 * Zelle controls the participating-bank hand-off after this URL opens.
 */
export function officialZelleUrl(payLink?: string | null): string | null {
  if (!payLink) return null;
  try {
    const url = new URL(payLink);
    if (url.protocol !== "https:" || !/(^|\.)zellepay\.com$/i.test(url.hostname)) return null;
    if (url.pathname !== "/qr-codes") return null;
    const data = url.searchParams.get("data");
    if (!data) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const CLIPBOARD_EXPLANATIONS: Record<ClipboardStatus, string> = {
  copied: "The recipient number is on your clipboard — just paste it in Zelle.",
  no_phone: "This restaurant has no Zelle number on file, so nothing was copied.",
  permission_denied:
    "Your browser blocked copying. Use the Copy button below, or press and hold the number.",
  insecure_context: "Copying is unavailable on this connection. Press and hold the number to copy.",
  unsupported: "This browser does not support automatic copying. Use the Copy button below.",
};

const REASON_MESSAGES: Record<ZelleFailureReason, { message: string; nextStep: string }> = {
  opened: {
    message: "A payment app took over — finish the payment there.",
    nextStep: "If nothing appeared, come back here and use the recipient number below.",
  },
  no_pay_link: {
    message: "No Zelle destination is stored for this restaurant yet.",
    nextStep: "Open Zelle in your bank app and send to the number below.",
  },
  unsupported_link: {
    message: "This restaurant's stored payment link is not a valid official Zelle QR link.",
    nextStep: "Open Zelle in your bank app and send to the number below.",
  },
  navigation_blocked: {
    message: "Your browser did not allow the official Zelle page to open.",
    nextStep: "Use the recipient number below or scan the QR from another device.",
  },
};

export function describeZelleFailure(
  reason: ZelleFailureReason,
): { message: string; nextStep: string } {
  return REASON_MESSAGES[reason];
}

/**
 * Prepare an official Zelle hand-off. The caller should navigate directly to
 * `attempted`; browsers cannot reliably report what a bank app does afterward.
 */
export async function startZelleHandoff(
  target: ZelleTarget,
  _opts: { timeoutMs?: number } = {},
): Promise<ZelleDiagnostics> {
  let clipboard: ClipboardStatus = "no_phone";
  let clipboardDetail: string | undefined;
  if (target.phone) {
    const res = await copyTextWithStatus(target.phone);
    clipboard = res.status;
    clipboardDetail = res.detail;
  }
  const copied = clipboard === "copied";

  const finish = (
    reason: ZelleFailureReason,
    attempted: string | null,
    opened = false,
  ): ZelleDiagnostics => {
    const { message, nextStep } = describeZelleFailure(reason);
    return {
      opened,
      copied,
      reason,
      clipboard,
      attempted,
      message,
      nextStep,
      ...(clipboardDetail ? { detail: clipboardDetail } : {}),
    };
  };

  if (!target.payLink) return finish("no_pay_link", null);

  const officialUrl = officialZelleUrl(target.payLink);
  if (!officialUrl) return finish("unsupported_link", null);
  return finish("opened", officialUrl, true);
}
