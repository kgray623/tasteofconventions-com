import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, LogOut, Printer, RefreshCw, Search, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getRestaurantPortalData,
  restaurantMarkPaid,
  restaurantPortalLogin,
  restaurantPortalLogout,
} from "@/lib/restaurant-portal.functions";
import type { PortalData } from "@/lib/restaurant-portal-types";
import { downloadTextFile } from "@/lib/download-file";

export const Route = createFileRoute("/restaurant")({
  head: () => ({
    meta: [
      { title: "Restaurant Portal — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Private portal for our partner restaurants: view pre-ordered meals for A Taste of Special Conventions and mark each order paid as guests pre-pay.",
      },
      { property: "og:title", content: "Restaurant Portal — A Taste of Special Conventions" },
      {
        property: "og:description",
        content: "View your pre-ordered meals and mark each order paid as guests call to pre-pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RestaurantPortalPage,
});

function RestaurantPortalPage() {
  const login = useServerFn(restaurantPortalLogin);
  const logout = useServerFn(restaurantPortalLogout);
  const fetchData = useServerFn(getRestaurantPortalData);
  const markPaid = useServerFn(restaurantMarkPaid);

  const [booting, setBooting] = useState(true);
  const [data, setData] = useState<PortalData | null>(null);
  const [restaurant, setRestaurant] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchData({ data: undefined } as never);
        if (res.signedIn && res.data) setData(res.data);
      } catch {
        /* not signed in */
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login({ data: { restaurant: restaurant.trim(), code: code.trim() } });
      if (!res.ok || !res.data) {
        toast.error("That restaurant name or access code isn't right.");
        return;
      }
      setData(res.data);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const res = await fetchData({ data: undefined } as never);
      if (res.signedIn && res.data) setData(res.data);
      else setData(null);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (preorderId: string, paid: boolean) => {
    setBusy(true);
    try {
      const res = await markPaid({ data: { preorderId, paid } });
      if (!res.signedIn) {
        setData(null);
        toast.error("Your session expired — please sign in again.");
        return;
      }
      if (res.data) setData(res.data);
      toast.success(paid ? "Marked paid" : "Payment undone");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((r) => {
      if (unpaidOnly && r.paid) return false;
      if (!q) return true;
      return r.guestName.toLowerCase().includes(q) || r.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    });
  }, [data, query, unpaidOnly]);

  const exportList = () => {
    if (!data) return;
    const header = "Guest,Phone,Meals,Status\n";
    const body = data.rows
      .map((r) => `${JSON.stringify(r.guestName)},${r.phone},${r.qty},${r.paid ? "Paid" : "Unpaid"}`)
      .join("\n");
    downloadTextFile(`${data.restaurant.name.replace(/\W+/g, "-").toLowerCase()}-orders.csv`, header + body);
  };

  if (booting) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!data) {
    return (
      <main className="min-h-screen px-4 py-12 bg-background">
        <div className="mx-auto max-w-sm">
          <h1 className="font-display text-3xl text-ink font-bold text-center">Restaurant Portal</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            A Taste of Special Conventions — view your pre-ordered meals and mark each one paid.
          </p>
          <Card className="mt-6 p-5 space-y-4">
            <form onSubmit={doLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="restaurant">
                  Restaurant name
                </label>
                <Input
                  id="restaurant"
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                  placeholder="Lalibela"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="code">
                  Access code
                </label>
                <Input
                  id="code"
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Sign in
              </Button>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-6 bg-background">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink font-bold flex items-center gap-2">
              <Utensils className="h-5 w-5" /> {data.restaurant.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.restaurant.cuisine} meals pre-ordered for A Taste of Special Conventions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout({ data: undefined } as never);
              setData(null);
            }}
          >
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-ink">{data.totals.mealsUnpaid}</div>
            <div className="text-xs text-muted-foreground">Meals unpaid</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-ink">{data.totals.mealsPaid}</div>
            <div className="text-xs text-muted-foreground">Meals paid</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-ink">{data.totals.meals}</div>
            <div className="text-xs text-muted-foreground">Total meals</div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant={unpaidOnly ? "default" : "outline"} size="sm" onClick={() => setUnpaidOnly((v) => !v)}>
            Unpaid only
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportList}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {rows.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground">No orders to show.</Card>
          )}
          {rows.map((r) => (
            <Card key={r.preorderId} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{r.guestName}</div>
                <div className="text-sm text-muted-foreground">
                  {r.phone || "no phone"} · {r.qty} meal{r.qty === 1 ? "" : "s"}
                </div>
                {r.paid && r.paidAt && (
                  <div className="text-xs text-muted-foreground">
                    Paid {new Date(r.paidAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {r.paid ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-emerald-600 text-white">Paid</Badge>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => toggle(r.preorderId, false)}>
                    Undo
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="shrink-0" disabled={busy} onClick={() => toggle(r.preorderId, true)}>
                  <Check className="h-4 w-4 mr-1" /> Mark paid
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
