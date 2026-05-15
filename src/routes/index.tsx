import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Utensils, Users, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A Taste of Special Conventions" },
      { name: "description", content: "Curated invitations, RSVPs, and restaurant ordering for an unforgettable evening." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-warm pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-terracotta mb-6">
            An Evening, Curated
          </p>
          <h1 className="font-display text-5xl sm:text-7xl leading-[1.05] text-ink">
            A Taste of <em className="text-terracotta not-italic">Special</em> Conventions
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Where every detail is crafted, every guest is welcomed, and every
            moment is unforgettable. Send invitations, gather RSVPs, and let
            guests order from your hand-picked restaurants — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-ink text-cream hover:bg-ink/90 px-8">
                Start hosting
              </Button>
            </Link>
            <Link to="/restaurants">
              <Button size="lg" variant="outline" className="px-8 border-ink/20">
                Browse restaurants
              </Button>
            </Link>
          </div>
          <div className="mt-16 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-gold" />
            Drinks &amp; snacks provided at all in-person events
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta mb-3">Event Essentials</p>
          <h2 className="font-display text-4xl sm:text-5xl text-ink">Everything your guests need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card rounded-lg border border-border p-7 hover:shadow-elegant transition-shadow">
              <div className="w-11 h-11 rounded-md bg-gold/15 text-gold flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-2xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Duplicate detection callout */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="bg-ink text-cream rounded-2xl p-10 sm:p-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-4">Built for collaboration</p>
            <h2 className="font-display text-3xl sm:text-4xl mb-4">No guest invited twice.</h2>
            <p className="text-cream/80 leading-relaxed">
              Multiple hosts can send invitations in parallel. We cross-reference
              every email and phone number across the entire guest list and flag
              duplicates instantly — so no one gets two invitations to the same
              event.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Email match detection",
              "Phone number normalization",
              "Per-event guest registry",
              "Live duplicate alerts on your dashboard",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 px-4 py-3 bg-cream/5 rounded-md border border-cream/10">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p className="font-display text-base">A Taste of Special Conventions</p>
        <p className="mt-2">An invitation worth remembering.</p>
      </footer>
    </div>
  );
}

const features = [
  { icon: Calendar, title: "Date & Time", body: "Set your event date, time and timezone — clear for in-person, virtual or hybrid attendees." },
  { icon: MapPin, title: "Location", body: "Display a physical venue, a virtual link, or both. Whatever fits the moment." },
  { icon: Utensils, title: "Curated Menus", body: "Connect multiple restaurants. Guests browse menus and pre-order before arrival." },
  { icon: Users, title: "Collaborative Invites", body: "Multiple hosts. One guest list. Zero duplicates — automatically." },
  { icon: ShieldCheck, title: "RSVP Magic Links", body: "Guests respond from a personal link — no account required." },
  { icon: Sparkles, title: "Dietary Notes", body: "Allergens, preferences and party size captured upfront." },
];
