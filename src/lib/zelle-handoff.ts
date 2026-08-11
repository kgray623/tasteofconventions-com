/**
 * Zelle hand-off helper.
 *
 * Zelle does not publish a public deep link that pre-fills a payment inside an
 * arbitrary bank app. What we CAN do reliably:
 *  1. copy the recipient phone number to the clipboard at the moment of the tap,
 *     so the guest never has to type or search for the restaurant;
 *  2. try the Zelle app URL scheme, which opens the Zelle/bank app when the
 *     phone has one registered for it;
 *  3. fall back to a sheet with the amount, recipient and a scannable QR when
 *     nothing claims the hand-off.
 */

export type ZelleTarget = {
  /** Official Zelle destination URL taken from the restaurant's own QR payload. */
  payLink?: string | null;
  /** Recipient phone number (Zelle token). */
  phone?: string | null;
  /** Recipient name as registered with Zelle. */
  name?: string | null;
};

/** Best-effort clipboard write. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path below */
  }
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

/**
 * Try to hand the payment off to a payment app on this device.
 *
 * Returns `true` when the page was backgrounded (an app took the hand-off) and
 * `false` when nothing did, in which case the caller should show the fallback.
 */
export async function startZelleHandoff(
  target: ZelleTarget,
  opts: { timeoutMs?: number } = {},
): Promise<{ opened: boolean; copied: boolean }> {
  const timeoutMs = opts.timeoutMs ?? 1200;

  // 1. Recipient on the clipboard first — useful no matter where we land.
  let copied = false;
  if (target.phone) copied = await copyText(target.phone);

  const scheme = zelleAppSchemeUrl(target.payLink);
  if (!scheme) return { opened: false, copied };

  // 2. Attempt the app hand-off and watch whether this page goes away.
  let backgrounded = false;
  const onHide = () => {
    if (document.visibilityState === "hidden") backgrounded = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("blur", onHide);

  try {
    window.location.href = scheme;
  } catch {
    /* unsupported scheme — treated as "not opened" below */
  }

  await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));

  document.removeEventListener("visibilitychange", onHide);
  window.removeEventListener("pagehide", onHide);
  window.removeEventListener("blur", onHide);

  return { opened: backgrounded || document.visibilityState === "hidden", copied };
}
