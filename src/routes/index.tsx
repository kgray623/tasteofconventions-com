import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  MapPin,
  Shirt,
  Gift,
  Utensils,
  Music,
  ArrowRight,
  Play,
  Film,
  Clock,
  Globe2,
  UtensilsCrossed,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "An Evening to Remember · A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "You're cordially invited to A Taste of Special Conventions — an evening of association, gift exchanges, cultural enrichment, and wonderful memories.",
      },
    ],
  }),
  component: Invitation,
});

type R = { id: string; name: string; description: string | null; cuisine: string | null };
type M = { id: string; restaurant_id: string; name: string; description: string | null; price: number; dietary_flags: string[] | null };

const tabs = [
  { id: "rsvp", label: "RSVP" },
  { id: "food", label: "Food & Pre-order" },
  { id: "datetime", label: "Date & Time" },
  { id: "location", label: "Location" },
  { id: "dress", label: "Dress Code" },
  { id: "gifts", label: "Gift Exchanges" },
  { id: "entertainment", label: "Entertainment" },
  { id: "itinerary", label: "Itinerary" },
];

function Invitation() {
  const [restaurants, setRestaurants] = useState<R[]>([]);
  const [items, setItems] = useState<M[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("restaurants").select("*").eq("active", true).order("name")
      .then(({ data }) => setRestaurants((data as R[]) ?? []));
    supabase.from("menu_items").select("*").eq("available", true)
      .then(({ data }) => setItems((data as M[]) ?? []));
  }, []);

  // Open accordion panel matching the URL hash, and re-open whenever hash changes.
  useEffect(() => {
    const validIds = tabs.map((t) => t.id);
    const applyHash = () => {
      const id = window.location.hash.replace("#", "");
      if (!validIds.includes(id)) return;
      setOpenItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
      // Wait a tick for the panel to expand, then scroll into view.
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        <div className="relative flex items-center px-6 sm:px-12 lg:px-16 py-16 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-8 font-medium">
              You're Cordially Invited
            </p>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-ink leading-[0.95]">
              A Taste of <em className="text-gradient-sunset">Special</em>
              <br />
              Conventions
            </h1>
            <p className="mt-6 font-display italic text-3xl sm:text-4xl text-ink/80">
              An evening to remember.
            </p>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-md">
              Please join us for an evening of association, gift exchanges,
              cultural enrichment, meeting new friends, and making wonderful
              memories — this side of paradise.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a href="#rsvp">
                <Button
                  size="lg"
                  className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0"
                >
                  RSVP — Click here
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <a href="#details">
                <Button size="lg" variant="outline" className="px-8">
                  See all details
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-sunset overflow-hidden min-h-[60vh] lg:min-h-full">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-iris/50 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-magenta/40 blur-3xl" />
          <div className="relative h-full flex items-center justify-center p-10">
            <div className="w-full max-w-sm bg-card/95 backdrop-blur-xl rounded-2xl shadow-elegant p-8 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
              <p className="text-[10px] uppercase tracking-[0.4em] text-magenta mb-4">You're invited</p>
              <h3 className="font-display text-4xl text-ink leading-none mb-1">
                A Taste of<br />
                <em className="text-gradient-sunset">Special Conventions</em>
              </h3>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sunset" />
                  Sunday · 4:00 – 9:00 PM
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sunset" />
                  Eagle's Landing · La Platte, NE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="mx-auto max-w-6xl px-6 pt-20">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">For Details · See the Video</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Watch the invitation</h2>
        </div>
        <div className="relative aspect-video rounded-3xl overflow-hidden border border-border bg-ink shadow-elegant">
          <div className="absolute inset-0 bg-gradient-sunset opacity-80" />
          <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-iris/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="relative h-full flex flex-col items-center justify-center text-cream gap-5 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-cream/15 backdrop-blur-md border border-cream/30 flex items-center justify-center">
              <Play className="w-8 h-8 ml-1 fill-cream" />
            </div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cream/80">
              <Film className="w-3.5 h-3.5" />
              Video intro · placeholder
            </div>
            <p className="font-display text-3xl sm:text-4xl max-w-xl leading-tight">
              Your cinematic invitation, coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* RSVP — primary call to action right under the video */}
      <section id="rsvp-cta" className="mx-auto max-w-3xl px-6 pt-16">
        <div className="rounded-3xl border border-border bg-card shadow-elegant p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-amber-glow/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-iris/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-3">Step One</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-4">RSVP</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-7">
              Let us know if you can join us — Yes, No, or Maybe — and your party size.
            </p>
            <Link to="/rsvp/preview">
              <Button
                size="lg"
                className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0"
              >
                Open RSVP form
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>



      {/* Tab nav */}
      <section id="details" className="sticky top-16 z-30 bg-background/85 backdrop-blur-md border-y border-border mt-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs uppercase tracking-widest border border-border bg-card hover:bg-gradient-sunset hover:text-white hover:border-transparent transition-colors"
            >
              {t.label}
            </a>
          ))}
        </div>
      </section>

      {/* Accordion details */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">Everything you'll want to know</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Tap to open</h2>
          <p className="mt-4 text-muted-foreground">
            Date and time, location, attire, gift exchanges, food choices, and entertainment.
          </p>
        </div>

        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-3">
          {/* RSVP */}
          <AccordionItem value="rsvp" id="rsvp" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <CheckCircle2 className="w-5 h-5 text-sunset" /> RSVP
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 space-y-4">
              <p className="text-muted-foreground">
                Let us know if you can join us. Click below to send your RSVP — Yes,
                No, or Maybe — and tell us your party size.
              </p>
              <Link to="/rsvp/preview">
                <Button className="bg-gradient-sunset text-white border-0 shadow-glow">
                  Open RSVP form
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </AccordionContent>
          </AccordionItem>

          {/* Food */}
          <AccordionItem value="food" id="food" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Utensils className="w-5 h-5 text-sunset" /> Food & Pre-order
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 space-y-5">
              <p className="text-muted-foreground">
                Choose your cuisine from our convention countries. Browse each
                restaurant's menu below and pre-order what you'd like to eat
                that evening. We'll collect everyone's choices and submit the
                orders together a few days before the event.
              </p>
              {restaurants.length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Restaurant menus are being added — check back soon.
                </p>
              )}
              <div className="space-y-4">
                {restaurants.map((r) => {
                  const menu = items.filter((m) => m.restaurant_id === r.id);
                  return (
                    <div key={r.id} className="rounded-xl border border-border p-5 bg-background">
                      <div className="flex items-baseline justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-display text-2xl">{r.name}</h3>
                          {r.cuisine && <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{r.cuisine}</p>}
                        </div>
                        <Link to="/rsvp/preview">
                          <Button size="sm" variant="outline">
                            Pre-order <ExternalLink className="ml-1.5 w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
                      {menu.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {menu.slice(0, 6).map((m) => (
                            <div key={m.id} className="flex justify-between gap-3 text-sm py-1.5 border-t border-border first:border-t-0">
                              <div>
                                <p className="font-medium">{m.name}</p>
                                {m.dietary_flags && m.dietary_flags.length > 0 && (
                                  <div className="flex gap-1 mt-0.5">
                                    {m.dietary_flags.map((f) => (
                                      <Badge key={f} variant="outline" className="text-[9px]">{f}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="font-display shrink-0">${Number(m.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">Menu coming soon.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Note: pre-orders are collected here and submitted to each
                restaurant a few days before the event with the event date as
                the coupon / pickup reference.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Date & Time */}
          <AccordionItem value="datetime" id="datetime" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Clock className="w-5 h-5 text-sunset" /> Date & Time
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-2">
              <p><strong className="text-ink">Sunday · 4:00 PM – 9:00 PM</strong></p>
              <p>Doors open at 4:00 PM — come early for association beforehand. Exact date confirmed in the video invitation above.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" id="location" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <MapPin className="w-5 h-5 text-sunset" /> Location
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-3">
              <p><strong className="text-ink">Eagle's Landing</strong> · La Platte, Nebraska</p>
              <div className="relative aspect-[16/8] rounded-xl overflow-hidden border border-border bg-gradient-to-br from-amber-glow/20 via-magenta/15 to-iris/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-sunset" />
              </div>
              <p className="text-sm">Full address and map will appear here once confirmed.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Dress */}
          <AccordionItem value="dress" id="dress" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Shirt className="w-5 h-5 text-sunset" /> Dress Code
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground">
              <p>Details on the dress code will be shared here — watch the video for inspiration.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Gifts */}
          <AccordionItem value="gifts" id="gifts" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Gift className="w-5 h-5 text-sunset" /> Gift Exchanges
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground">
              <p>A warm tradition of giving. Guidelines and exchange format will appear here soon.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Entertainment */}
          <AccordionItem value="entertainment" id="entertainment" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Music className="w-5 h-5 text-sunset" /> Entertainment
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground">
              <p>Live music, surprises, and moments worth remembering across each of the convention countries.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Itinerary */}
          <AccordionItem value="itinerary" id="itinerary" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Globe2 className="w-5 h-5 text-sunset" /> Itinerary — Conventions & Countries
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <p className="text-muted-foreground mb-5">
                Doors at 4:00 PM for association. We'll journey together through four conventions.
              </p>
              <ol className="relative border-l-2 border-dashed border-border ml-3 space-y-6">
                {itinerary.map((stop, i) => (
                  <li key={stop.country} className="relative pl-6">
                    <span
                      className="absolute -left-[11px] top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-glow"
                      style={{ background: gradients[i % gradients.length] }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{stop.when}</p>
                    <h4 className="font-display text-2xl text-ink">{stop.country}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{stop.note}</p>
                    {stop.restaurant ? (
                      <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-gradient-sunset text-white text-[10px] uppercase tracking-widest shadow-glow">
                        <UtensilsCrossed className="w-3 h-3" />
                        Restaurant to order from
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[10px] uppercase tracking-widest">
                        Savor the moment
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p className="font-display text-2xl text-ink">A Taste of Special Conventions</p>
        <p className="mt-2 italic">An evening to remember · this side of paradise.</p>
      </footer>
    </div>
  );
}

const gradients = [
  "linear-gradient(135deg, #ff6b35, #f7931e)",
  "linear-gradient(135deg, #f7931e, #e84393)",
  "linear-gradient(135deg, #e84393, #6c5ce7)",
  "linear-gradient(135deg, #6c5ce7, #ff6b35)",
];

const itinerary = [
  { country: "Myanmar", when: "Convention · 2014", note: "We open with Myanmar friends — flavors and stories from 2014.", restaurant: true },
  { country: "Bolivia", when: "Convention · 2016", note: "Next, the highlands of Bolivia — a taste of 2016, shared together.", restaurant: true },
  { country: "Jakarta, Indonesia", when: "Convention · December 2025", note: "Our most recent gathering — the warmth of Jakarta, fresh in heart.", restaurant: true },
  { country: "New Zealand", when: "Convention · January 2026", note: "We close in New Zealand — no menu to order from, just memories to make.", restaurant: false },
];
