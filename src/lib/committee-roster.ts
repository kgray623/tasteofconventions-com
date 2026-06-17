export type CommitteeRosterSource = "inviter" | "teamInvite" | "member";

export type CommitteeRosterInput = {
  id: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  contact?: string | null;
  role?: string | null;
  status?: string | null;
  source: CommitteeRosterSource;
};

export type CommitteeRosterMember = {
  key: string;
  name: string;
  contact: string;
  status: string;
  role: string;
  sources: CommitteeRosterSource[];
};

export const normalizeRosterPhone = (value: string | null | undefined) =>
  (value ?? "").replace(/\D/g, "");

const normalizeRosterName = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const nameTokens = (value: string | null | undefined) =>
  normalizeRosterName(value)
    .replace(/&/g, " ")
    .split(" ")
    .filter((token) => token.length > 1);

const compactName = (value: string | null | undefined) => nameTokens(value).join("");

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev.splice(0, prev.length, ...curr);
  }
  return prev[b.length];
};

const tokensClose = (a: string, b: string) => {
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  return maxLen >= 5 && levenshtein(a, b) <= 2;
};

const looksLikeCoupleAlias = (candidate: string, existing: string) => {
  const candidateNorm = normalizeRosterName(candidate);
  const existingNorm = normalizeRosterName(existing);
  const longer = candidateNorm.length > existingNorm.length ? candidateNorm : existingNorm;
  const shorter = candidateNorm.length > existingNorm.length ? existingNorm : candidateNorm;
  if (!longer.includes("&") && !/\band\b/.test(longer)) return false;
  return compactName(longer).includes(compactName(shorter));
};

export const rosterNamesLikelySame = (a: string | null | undefined, b: string | null | undefined) => {
  const compactA = compactName(a);
  const compactB = compactName(b);
  if (!compactA || !compactB) return false;
  if (compactA === compactB) return true;
  if (looksLikeCoupleAlias(a ?? "", b ?? "")) return true;

  const aTokens = nameTokens(a);
  const bTokens = nameTokens(b);
  if (aTokens.length < 2 || bTokens.length < 2) return false;
  const [aFirst, aLast] = [aTokens[0], aTokens[aTokens.length - 1]];
  const [bFirst, bLast] = [bTokens[0], bTokens[bTokens.length - 1]];
  return aFirst[0] === bFirst[0] && tokensClose(aFirst, bFirst) && tokensClose(aLast, bLast);
};

const sourceRank: Record<CommitteeRosterSource, number> = {
  inviter: 0,
  teamInvite: 1,
  member: 2,
};

export function buildCommitteeRoster(rows: CommitteeRosterInput[]) {
  const roster: CommitteeRosterMember[] = [];

  const sorted = [...rows].sort((a, b) => {
    const bySource = sourceRank[a.source] - sourceRank[b.source];
    if (bySource !== 0) return bySource;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  for (const row of sorted) {
    const phone = normalizeRosterPhone(row.phone ?? row.contact);
    const tail = phone.length >= 7 ? phone.slice(-10) : "";
    const name = (row.name ?? row.phone ?? row.email ?? "Committee member").trim() || "Committee member";
    const contact = row.phone || row.contact || row.email || (row.source === "member" ? "Signed in" : "No phone");
    const match = roster.find((member) => {
      const memberPhone = normalizeRosterPhone(member.contact);
      if (tail && memberPhone && memberPhone.slice(-10) === tail) return true;
      return rosterNamesLikelySame(member.name, name);
    });

    if (!match) {
      roster.push({
        key: `${row.source}-${row.id}`,
        name,
        contact,
        status: row.status || "Pending signup",
        role: row.role === "admin" ? "admin" : "team",
        sources: [row.source],
      });
      continue;
    }

    if (!match.sources.includes(row.source)) match.sources.push(row.source);
    if (row.status === "Joined") match.status = "Joined";
    if (row.role === "admin") match.role = "admin";
    if ((match.contact === "Signed in" || match.contact === "No phone") && contact !== "No phone") {
      match.contact = contact;
    }
  }

  return roster.sort((a, b) => a.name.localeCompare(b.name));
}