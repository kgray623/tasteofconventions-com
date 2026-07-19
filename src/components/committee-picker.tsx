import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCommitteeRoster } from "@/lib/invitations.functions";

type Member = { id: string; name: string; kind: "committee" | "guest" };

const HONORIFICS = [
  "sister", "sis", "sr",
  "brother", "bro", "br",
  "elder", "elder.",
  "pastor", "pr",
  "dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.",
];

function normalize(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHonorifics(v: string) {
  const tokens = normalize(v).split(" ").filter(Boolean);
  while (tokens.length > 1 && HONORIFICS.includes(tokens[0])) tokens.shift();
  return tokens.join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

// Score 0..1, higher = better match. Returns 0 for no match.
function scoreMember(query: string, member: Member): number {
  if (!query) return 0;
  const q = stripHonorifics(query);
  const qTokens = q.split(" ").filter(Boolean);
  if (qTokens.length === 0) return 0;

  const n = normalize(member.name);
  const nTokens = n.split(" ").filter(Boolean);
  if (nTokens.length === 0) return 0;

  // Exact / prefix match
  if (n === q) return 1;
  if (n.startsWith(q) || n.includes(` ${q}`)) return 0.95;

  // Every query token has a good match in the name
  let tokenScoreSum = 0;
  let matched = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const nt of nTokens) {
      if (nt === qt) best = Math.max(best, 1);
      else if (nt.startsWith(qt) || qt.startsWith(nt)) best = Math.max(best, 0.85);
      else if (nt.includes(qt) || qt.includes(nt)) best = Math.max(best, 0.7);
      else {
        const d = levenshtein(qt, nt);
        const maxLen = Math.max(qt.length, nt.length);
        if (maxLen >= 3) {
          const sim = 1 - d / maxLen;
          if (sim >= 0.6 && d <= 2) best = Math.max(best, sim * 0.9);
          else if (sim >= 0.5 && d <= 3 && maxLen >= 5) best = Math.max(best, sim * 0.75);
        }
      }
    }
    if (best > 0) matched += 1;
    tokenScoreSum += best;
  }

  if (matched === 0) return 0;
  const avg = tokenScoreSum / qTokens.length;
  // Bonus when every token matched
  return matched === qTokens.length ? avg : avg * 0.6;
}

export function CommitteePicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (name: string) => void;
  id?: string;
}) {
  const load = useServerFn(getCommitteeRoster);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await load();
        if (alive) setMembers((res.members ?? []) as Member[]);
      } catch {
        if (alive) setMembers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const selected = members.find((m) => m.name.toLowerCase() === value.trim().toLowerCase());

  const { exact, suggestions, showingAll } = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Empty query: show first page of full roster
      return {
        exact: members.slice(0, 100),
        suggestions: [] as Array<Member & { score: number }>,
        showingAll: true,
      };
    }
    const qNorm = stripHonorifics(q);
    const scored = members
      .map((m) => ({ ...m, score: scoreMember(q, m) }))
      .filter((m) => m.score > 0.35)
      .sort((a, b) => b.score - a.score);

    const exactHits = scored.filter((m) => {
      const n = normalize(m.name);
      return n === qNorm || n.startsWith(qNorm) || n.includes(` ${qNorm}`);
    });

    if (exactHits.length > 0) {
      return { exact: exactHits.slice(0, 30), suggestions: [], showingAll: false };
    }
    return {
      exact: [],
      suggestions: scored.slice(0, 5),
      showingAll: false,
    };
  }, [members, query]);

  const hasStaleValue = value.trim().length > 0 && !selected && !loading;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-left font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected
                ? selected.name
                : loading
                  ? "Loading names…"
                  : "Type the name of the person who invited you"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name (first, last, or full)…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {exact.length === 0 && suggestions.length === 0 && (
                <CommandEmpty>No one on the roster matches that name.</CommandEmpty>
              )}
              {exact.length > 0 && (
                <CommandGroup heading={showingAll ? "Everyone on the roster" : "Matches"}>
                  {exact.map((m) => (
                    <CommandItem
                      key={`${m.kind}-${m.id}`}
                      value={m.name}
                      onSelect={() => {
                        onChange(m.name);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected?.id === m.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">{m.name}</span>
                      <Badge
                        variant={m.kind === "committee" ? "default" : "secondary"}
                        className="ml-2 text-[10px] uppercase tracking-wide"
                      >
                        {m.kind === "committee" ? "Committee" : "Guest"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {suggestions.length > 0 && (
                <CommandGroup heading="Did you mean…?">
                  {suggestions.map((m) => (
                    <CommandItem
                      key={`sugg-${m.kind}-${m.id}`}
                      value={`sugg-${m.name}`}
                      onSelect={() => {
                        onChange(m.name);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <span className="flex-1 truncate">{m.name}</span>
                      <Badge
                        variant={m.kind === "committee" ? "default" : "secondary"}
                        className="ml-2 text-[10px] uppercase tracking-wide"
                      >
                        {m.kind === "committee" ? "Committee" : "Guest"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {hasStaleValue && (
        <p className="text-xs text-terracotta">
          "{value}" isn't on the roster — please pick a name from the list.
        </p>
      )}
    </div>
  );
}
