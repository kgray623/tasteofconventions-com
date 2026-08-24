const EVENT_TIME_ZONE = "America/Chicago";

/**
 * Formats an event timestamp in the event's own time zone (US Central),
 * so guests never see a UTC-shifted time like "9:00:00 PM".
 * Example: "Sunday, August 30, 2026 · 4:00 PM CDT"
 */
export function formatEventDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return `${day} · ${time}`;
}

/** Formats a start–end window in Central time, e.g. "Sunday, August 30, 2026 · 4:00 PM – 9:00 PM CDT". */
export function formatEventDateRange(start: string | Date, end?: string | Date | null): string {
  if (!end) return formatEventDateTime(start);
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return formatEventDateTime(start);
  }
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startDate);
  const startTime = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(startDate);
  const endTime = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(endDate);
  return `${day} · ${startTime} – ${endTime}`;
}
