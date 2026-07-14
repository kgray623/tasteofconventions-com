import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchGuests, type GuestSearchResult } from "@/lib/guest-search.functions";

function StatusBadge({ status, mode }: { status: string; mode: string | null }) {
  const s = (status || "").toLowerCase();
  if (s === "yes" || s === "confirmed") {
    const isVirtual = (mode || "").toLowerCase() === "virtual" || (mode || "").toLowerCase() === "zoom";
    return (
      <Badge className={isVirtual ? "bg-blue-600 text-white hover:bg-blue-600" : "bg-emerald-600 text-white hover:bg-emerald-600"}>
        {isVirtual ? "Confirmed · Virtual" : "Confirmed · In person"}
      </Badge>
    );
  }
  if (s === "no" || s === "declined") {
    return <Badge className="bg-red-600 text-white hover:bg-red-600">Declined</Badge>;
  }
  if (s === "waitlist") {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Waitlist</Badge>;
  }
  return <Badge variant="secondary">Not confirmed</Badge>;
}

export function GuestSearchBar() {
  const runSearch = useServerFn(searchGuests);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GuestSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  const trimmed = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await runSearch({ data: { q: trimmed } });
        if (id !== reqIdRef.current) return;
        setResults(res);
      } catch (e) {
        if (id !== reqIdRef.current) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [trimmed, runSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showPanel = open && trimmed.length >= 2;

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-40 -mx-4 md:mx-0 bg-background/95 backdrop-blur border-b border-border"
    >
      <div className="px-4 md:px-0 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search guests by name, phone, or committee member"
            className="pl-9 pr-9 h-10"
            aria-label="Search guests"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setResults([]);
                setOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {showPanel && (
            <div className="absolute left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg max-h-[420px] overflow-auto z-50">
              {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </div>
              )}
              {!loading && error && (
                <div className="px-3 py-3 text-sm text-destructive">{error}</div>
              )}
              {!loading && !error && results.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No guests match "{trimmed}".
                </div>
              )}
              {!loading && !error && results.length > 0 && (
                <ul className="divide-y divide-border">
                  {results.map((r) => (
                    <li key={r.invitationId} className="px-3 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.guestName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.guestPhone || "No phone"}
                          {r.inviterName ? ` · Added by ${r.inviterName}` : ""}
                          {r.partySize > 1 ? ` · Party of ${r.partySize}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={r.status} mode={r.attendanceMode} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
