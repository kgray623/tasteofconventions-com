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

/** Why the tap did not end up inside a payment app. */
export type ZelleFailureReason =
  | "opened"
  | "no_pay_link"
  | "unsupported_link"
  | "no_app_registered"
  | "scheme_blocked"
  | "desktop_browser"
  | "in_app_browser";

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

const isMobileUA = () =>
  typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

const isInAppBrowser = () =>
  typeof navigator !== "undefined" &&
  /(FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|GSA\/)/i.test(navigator.userAgent);

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

/** Turn the https QR-payload link into the Zelle app's own scheme, when possible. */
export function zelleAppSchemeUrl(payLink?: string | null): string | null {
  if (!payLink) return null;
  try {
    const url = new URL(payLink);
    if (!/zellepay\.com$/i.test(url.hostname)) return null;
    const data = url.searchParams.get("data");
    if (!data) return null;
    return `zellepay://qr-codes?data=${encodeURIComponent(data)}`;
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
    message: "The stored payment link is not a Zelle QR link we can hand off.",
    nextStep: "Open Zelle in your bank app and send to the number below.",
  },
  no_app_registered: {
    message: "No app on this phone claimed the Zelle hand-off (Zelle or your bank app is missing, or it does not accept links).",
    nextStep: "Open Zelle inside your bank app, choose Send, and paste the number below.",
  },
  scheme_blocked: {
    message: "This browser blocked the app hand-off.",
    nextStep: "Open Zelle inside your bank app, choose Send, and paste the number below.",
  },
  desktop_browser: {
    message: "You're on a computer, so there is no Zelle app to open here.",
    nextStep: "Scan the QR below with your phone, or pay from your bank app using the number below.",
  },
  in_app_browser: {
    message:
      "You're inside another app's built-in browser, which cannot open payment apps.",
    nextStep: "Open this page in Safari or Chrome, or pay from your bank app using the number below.",
  },
};

export function describeZelleFailure(
  reason: ZelleFailureReason,
): { message: string; nextStep: string } {
  return REASON_MESSAGES[reason];
}

/**
 * Try to hand the payment off to a payment app on this device, and report
 * exactly what happened so the UI can explain the failure.
 */
export async function startZelleHandoff(
  target: ZelleTarget,
  opts: { timeoutMs?: number } = {},
): Promise<ZelleDiagnostics> {
  const timeoutMs = opts.timeoutMs ?? 1200;

  // 1. Recipient on the clipboard first — useful no matter where we land.
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

  const scheme = zelleAppSchemeUrl(target.payLink);
  if (!scheme) return finish("unsupported_link", null);

  if (isInAppBrowser()) return finish("in_app_browser", scheme);
  if (!isMobileUA()) return finish("desktop_browser", scheme);

  // 2. Attempt the app hand-off and watch whether this page goes away.
  let backgrounded = false;
  const onHide = () => {
    if (document.visibilityState === "hidden") backgrounded = true;
  };
  const onBlur = () => {
    backgrounded = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("blur", onBlur);

  let threw: string | undefined;
  try {
    window.location.href = scheme;
  } catch (err) {
    threw = (err as { message?: string })?.message ?? "navigation blocked";
  }

  await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));

  document.removeEventListener("visibilitychange", onHide);
  window.removeEventListener("pagehide", onHide);
  window.removeEventListener("blur", onBlur);

  const opened = backgrounded || document.visibilityState === "hidden";
  if (opened) return finish("opened", scheme, true);
  if (threw) {
    const out = finish("scheme_blocked", scheme);
    return { ...out, detail: threw };
  }
  return finish("no_app_registered", scheme);
}
