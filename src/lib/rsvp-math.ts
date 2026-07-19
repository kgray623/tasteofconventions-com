/**
 * RSVP calculation engine — canonical source of truth for every dashboard.
 *
 * Business rules (audit LOW-001, LOW-002):
 *  - "People" always means party-size total; "responses" means row count.
 *    People is what the user cares about — see `docs/rsvp-business-rules.md`.
 *  - Pending = invitations with no valid status yet; counted at party-size
 *    (CRITICAL-002). Blank/unrecognized status counts as pending, not "yes".
 *  - Confirmed (yes) rows with a blank/unknown attendance_mode go into
 *    `inPersonAssumed`, NOT `inPerson` (CRITICAL-003). This surfaces bad
 *    imports instead of silently inflating the in-person count.
 *  - Party size is coerced to 1 for null/NaN/<=0 but `dataQuality.partySizeCoerced`
 *    increments so admins can spot and clean up the source row (HIGH-001).
 *  - Duplicate invitations are collapsed by group id (best status wins;
 *    ties broken by larger party size) so a guest with two rows isn't
 *    double-counted.
 *  - All status normalization goes through `normalizeRsvpStatus` (HIGH-002).
 *
 * Do NOT re-implement these rules elsewhere. Every dashboard must call
 * `computeRsvpRollup` (via `rsvp-totals.functions.ts`) — MEDIUM-004.
 */
export type RsvpMathRow = {
  id?: string | null;
  groupId?: string | null;
  status?: string | null;
  party_size?: number | string | null;
  attendance_mode?: string | null;
};


export type RsvpIdentityRow = {
  id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_phone_normalized?: string | null;
};

export type RsvpRollup = {
  responses: {
    uploaded: number;
    responded: number;
    confirmed: number;
    inPerson: number;
    /** Confirmed (yes) with no attendance mode — surfaced separately, not silently counted as in-person. */
    inPersonAssumed: number;
    zoom: number;
    declined: number;
    maybe: number;
    waitlist: number;
    pending: number;
  };
  people: {
    allIfEveryoneShowed: number;
    confirmed: number;
    inPerson: number;
    inPersonAssumed: number;
    zoom: number;
    declined: number;
    maybe: number;
    waitlist: number;
    pending: number;
  };
  /** Non-zero values indicate data-quality issues that were previously silently coerced. */
  dataQuality: {
    partySizeCoerced: number;
    statusUnknown: number;
    attendanceModeUnknown: number;
  };
};

const statusRank = (status: string | null | undefined) =>
  status === "yes" ? 4 : status === "waitlist" ? 3 : status === "maybe" ? 2 : status === "no" ? 1 : 0;

const normalizeGuestNameForDuplicate = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");

const diceCoefficient = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2);
      out.set(gram, (out.get(gram) ?? 0) + 1);
    }
    return out;
  };
  const aGrams = grams(a);
  const bGrams = grams(b);
  let overlap = 0;
  for (const [gram, count] of aGrams) {
    overlap += Math.min(count, bGrams.get(gram) ?? 0);
  }
  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
};

const isLikelyDuplicateIdentity = (a: RsvpIdentityRow, b: RsvpIdentityRow) => {
  const aName = normalizeGuestNameForDuplicate(a.guest_name);
  const bName = normalizeGuestNameForDuplicate(b.guest_name);
  const aPhone = (a.guest_phone_normalized ?? a.guest_phone ?? "").replace(/\D/g, "").slice(-10);
  const bPhone = (b.guest_phone_normalized ?? b.guest_phone ?? "").replace(/\D/g, "").slice(-10);
  if (aName.length < 4 || bName.length < 4 || aPhone.length < 7 || bPhone.length < 7) return false;
  const shorter = aPhone.length <= bPhone.length ? aPhone : bPhone;
  const longer = aPhone.length <= bPhone.length ? bPhone : aPhone;
  const phoneLooksSame = aPhone === bPhone || longer.includes(shorter);
  return phoneLooksSame && diceCoefficient(aName, bName) >= 0.7;
};

export const rsvpPartySize = (value: number | string | null | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
};

/** Returns coerced party size along with a flag indicating whether the input was invalid. */
export const rsvpPartySizeStrict = (value: number | string | null | undefined) => {
  const n = Number(value);
  const valid = Number.isFinite(n) && n > 0;
  return { value: valid ? Math.round(n) : 1, wasCoerced: !valid };
};

export const rsvpIsZoom = (attendanceMode: string | null | undefined) => attendanceMode === "zoom";

/** Normalized attendance mode: "in_person" | "zoom" | "unknown" (null/blank/unrecognized). */
export const rsvpAttendanceMode = (mode: string | null | undefined): "in_person" | "zoom" | "unknown" =>
  mode === "in_person" ? "in_person" : mode === "zoom" ? "zoom" : "unknown";

export const normalizeRsvpStatus = (status: string | null | undefined) =>
  status === "yes" || status === "no" || status === "maybe" || status === "waitlist" ? status : null;

export function buildDuplicateGroupIds(rows: RsvpIdentityRow[]) {
  const normName = (value: string | null | undefined) =>
    (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const normPhone = (value: string | null | undefined) =>
    (value ?? "").replace(/\D/g, "").slice(-10);

  const keyToGroup = new Map<string, string>();
  const idToGroup = new Map<string, string>();

  for (const row of rows) {
    const keys: string[] = [];
    const name = normName(row.guest_name);
    const phone = normPhone(row.guest_phone_normalized ?? row.guest_phone);
    if (name) keys.push(`n:${name}`);
    if (phone.length >= 7) keys.push(`p:${phone}`);

    let groupId: string | null = null;
    for (const key of keys) {
      const existing = keyToGroup.get(key);
      if (existing) {
        groupId = existing;
        break;
      }
    }
    if (!groupId) groupId = row.id;
    for (const key of keys) keyToGroup.set(key, groupId);
    idToGroup.set(row.id, groupId);
  }

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (!isLikelyDuplicateIdentity(rows[i], rows[j])) continue;
      const aGroup = idToGroup.get(rows[i].id) ?? rows[i].id;
      const bGroup = idToGroup.get(rows[j].id) ?? rows[j].id;
      const canonical = aGroup < bGroup ? aGroup : bGroup;
      const replace = aGroup < bGroup ? bGroup : aGroup;
      for (const [id, group] of idToGroup) {
        if (group === replace || id === replace) idToGroup.set(id, canonical);
      }
      for (const [key, group] of keyToGroup) {
        if (group === replace) keyToGroup.set(key, canonical);
      }
      idToGroup.set(rows[i].id, canonical);
      idToGroup.set(rows[j].id, canonical);
    }
  }

  return idToGroup;
}

export function computeRsvpRollup(rows: RsvpMathRow[]): RsvpRollup {
  const grouped = new Map<
    string,
    { status: string | null; partySize: number; attendanceMode: string | null; partySizeCoerced: boolean; statusUnknown: boolean }
  >();

  rows.forEach((row, index) => {
    const groupId = row.groupId || row.id || `row-${index}`;
    const partySize = rsvpPartySizeStrict(row.party_size);
    const status = normalizeRsvpStatus(row.status);
    const rawStatus = typeof row.status === "string" ? row.status.trim() : "";
    const statusUnknown = !status && rawStatus.length > 0;
    const candidate = {
      status,
      partySize: partySize.value,
      attendanceMode: row.attendance_mode ?? null,
      partySizeCoerced: partySize.wasCoerced,
      statusUnknown,
    };
    const current = grouped.get(groupId);
    if (
      !current ||
      statusRank(candidate.status) > statusRank(current.status) ||
      (statusRank(candidate.status) === statusRank(current.status) && candidate.partySize > current.partySize)
    ) {
      grouped.set(groupId, candidate);
    }
  });

  const rollup: RsvpRollup = {
    responses: {
      uploaded: grouped.size,
      responded: 0,
      confirmed: 0,
      inPerson: 0,
      inPersonAssumed: 0,
      zoom: 0,
      declined: 0,
      maybe: 0,
      waitlist: 0,
      pending: 0,
    },
    people: {
      allIfEveryoneShowed: 0,
      confirmed: 0,
      inPerson: 0,
      inPersonAssumed: 0,
      zoom: 0,
      declined: 0,
      maybe: 0,
      waitlist: 0,
      pending: 0,
    },
    dataQuality: {
      partySizeCoerced: 0,
      statusUnknown: 0,
      attendanceModeUnknown: 0,
    },
  };

  for (const row of grouped.values()) {
    const party = row.partySize;
    const status = row.status;
    if (row.partySizeCoerced) rollup.dataQuality.partySizeCoerced += 1;
    if (row.statusUnknown) rollup.dataQuality.statusUnknown += 1;
    rollup.people.allIfEveryoneShowed += party;
    if (!status) {
      rollup.responses.pending += 1;
      // CRITICAL-002: pending people counts party size, not a flat 1 per response.
      rollup.people.pending += party;
      continue;
    }

    rollup.responses.responded += 1;
    if (status === "yes") {
      rollup.responses.confirmed += 1;
      rollup.people.confirmed += party;
      const mode = rsvpAttendanceMode(row.attendanceMode);
      if (mode === "zoom") {
        rollup.responses.zoom += 1;
        rollup.people.zoom += party;
      } else if (mode === "in_person") {
        rollup.responses.inPerson += 1;
        rollup.people.inPerson += party;
      } else {
        // CRITICAL-003: yes with unknown attendance mode is flagged, not silently in-person.
        rollup.responses.inPersonAssumed += 1;
        rollup.people.inPersonAssumed += party;
        rollup.dataQuality.attendanceModeUnknown += 1;
      }
    } else if (status === "no") {
      rollup.responses.declined += 1;
      rollup.people.declined += party;
    } else if (status === "maybe") {
      rollup.responses.maybe += 1;
      rollup.people.maybe += party;
    } else if (status === "waitlist") {
      rollup.responses.waitlist += 1;
      rollup.people.waitlist += party;
    }
  }

  // MEDIUM-002: emit a single structured warning per rollup when the input
  // data has anomalies. Dev/preview only — the UI (rsvp-totals-card) shows a
  // user-visible callout so admins can act on the same signal.
  if (
    typeof console !== "undefined" &&
    (rollup.dataQuality.partySizeCoerced > 0 ||
      rollup.dataQuality.statusUnknown > 0 ||
      rollup.dataQuality.attendanceModeUnknown > 0)
  ) {
    console.warn("[rsvp-math] data quality issues detected", {
      partySizeCoerced: rollup.dataQuality.partySizeCoerced,
      statusUnknown: rollup.dataQuality.statusUnknown,
      attendanceModeUnknown: rollup.dataQuality.attendanceModeUnknown,
      rowsIn: rows.length,
    });
  }

  return rollup;
}

/** Human-friendly "N people / M responses" — hides the split when they match. */
export const formatPeopleResponses = (people: number, responses: number) =>
  people === responses ? `${people}` : `${people} people / ${responses} responses`;
