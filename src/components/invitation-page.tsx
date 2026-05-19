import { Link } from "@tanstack/react-router";
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
  Music,
  ArrowRight,
  Play,
  Film,
  Clock,
  Globe2,
  UtensilsCrossed,
  ExternalLink,
} from "lucide-react";

type R = { id: string; name: string; description: string | null; cuisine: string | null };
type M = { id: string; restaurant_id: string; name: string; description: string | null; price: number; dietary_flags: string[] | null };

const tabs = [
  { id: "datetime", label: "Date & Time" },
  { id: "location", label: "Location" },
  { id: "dress", label: "Dress Code" },
  { id: "gifts", label: "Gift Exchanges" },
  { id: "entertainment", label: "Entertainment" },
];

export function InvitationPage() {
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
              An event and an evening to remember.
            </p>
            <p className="mt-6 text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-xl">
              Please join us for a very special evening of association, gift
              exchanges, cultural enrichment, meeting new friends, and making
              wonderful memories — all on this side of paradise. See the video
              for more details.
            </p>



          </div>
        </div>

        <div className="relative bg-gradient-sunset overflow-hidden min-h-[60vh] lg:min-h-full flex items-center justify-center p-6 sm:p-10">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-iris/50 blur-3xl" />
          <div className="relative w-full max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-cream/90 mb-3 text-center">For Details · Watch the Invitation</p>
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-cream/20 bg-ink/40 backdrop-blur-md shadow-elegant">
              <iframe
                src="https://drive.google.com/file/d/1OkaByzAsVsAmvQIvp26vnKBLH_0Y8W-e/preview"
                title="A Taste of Special Conventions · Invitation video"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
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
            <p className="text-muted-foreground max-w-md mx-auto mb-3">
              Let us know if you can join us — Yes or No — and your party size.
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-magenta mb-7">
              Space is limited · First come, first served
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



      {/* Conventions & Countries — prominent, always-visible section */}
      <section id="itinerary" className="mx-auto max-w-3xl px-6 pt-16">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3 flex items-center justify-center gap-2">
            <Globe2 className="w-4 h-4" /> Conventions & Countries
          </p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">A Journey Together</h2>
          <p className="mt-4 text-muted-foreground">
            Join us and journey together through the following special
            conventions. Pre-order your cuisine from the convention country
            of choice, featuring the restaurants below.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-elegant p-6 sm:p-8">
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
                  <Link to="/rsvp/preview" className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-gradient-sunset text-white text-[10px] uppercase tracking-widest shadow-glow hover:opacity-90 transition">
                    <UtensilsCrossed className="w-3 h-3" />
                    Pre-order the cuisine
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[10px] uppercase tracking-widest">
                    Savor the moment
                  </span>
                )}
              </li>
            ))}
          </ol>

          {restaurants.length > 0 && (
            <div className="mt-8 space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-magenta">Featured restaurants & menus</p>
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
                    {menu.length > 0 && (
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
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground italic">
                Pre-orders are collected here and submitted to each restaurant a few days before the event.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Accordion details */}
      <section id="details" className="mx-auto max-w-3xl px-6 py-16 mt-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">Please see the following information</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Tap to open</h2>
          <p className="mt-4 text-muted-foreground">
            Date and time, location, attire, gift exchanges, and entertainment.
          </p>
        </div>

        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-3">
          {/* Date & Time */}
          <AccordionItem value="datetime" id="datetime" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Clock className="w-5 h-5 text-sunset" /> Date & Time
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-2">
              <p><strong className="text-ink">Sunday, November 1, 2026 · 4:00 PM – 9:00 PM</strong></p>
              <p>Join us from 4:00 PM to 9:00 PM for a full evening together.</p>
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
              <p className="text-sm">GPS coordinates and map will appear here once confirmed.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Dress */}
          <AccordionItem value="dress" id="dress" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Shirt className="w-5 h-5 text-sunset" /> Dress Code
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p>
                This is an international event, so international attire is
                encouraged. Is there a culture you love to dress in? Please do —
                it'll make the evening more fun and beautiful for everyone.
              </p>
              <VideoPlaceholder label="Dress code · video coming soon" />
            </AccordionContent>
          </AccordionItem>

          {/* Gifts */}
          <AccordionItem value="gifts" id="gifts" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Gift className="w-5 h-5 text-sunset" /> Gift Exchanges
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p>
                In the spirit of the special and international conventions,
                friends bring gifts to exchange. See the video below — it'll
                walk you through exactly how it works.
              </p>
              <VideoPlaceholder label="Gift exchanges · video coming soon" />
            </AccordionContent>
          </AccordionItem>

          {/* Entertainment */}
          <AccordionItem value="entertainment" id="entertainment" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-display text-2xl">
                <Music className="w-5 h-5 text-sunset" /> Entertainment
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p>
                Do you have a talent you'd like to share at the event? We are
                looking for entertainment — please submit a video on this
                platform, and we'll reach out if we have time.
              </p>
              <VideoPlaceholder label="Entertainment · video coming soon" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>


      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p className="font-display text-2xl text-ink">A Taste of Special Conventions</p>
        <p className="mt-2 italic">An event and an evening to remember · this side of paradise.</p>
      </footer>
    </div>
  );
}

function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-gradient-to-br from-ink/90 via-ink to-ink/80 flex flex-col items-center justify-center gap-3 text-cream">
      <div className="w-12 h-12 rounded-full bg-cream/15 backdrop-blur border border-cream/30 flex items-center justify-center">
        <Play className="w-5 h-5 ml-0.5 fill-cream" />
      </div>
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cream/80">
        <Film className="w-3 h-3" />
        {label}
      </div>
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
