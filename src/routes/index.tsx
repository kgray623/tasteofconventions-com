import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Utensils, Users, ShieldCheck, Sparkles, ArrowRight, Play, Film } from "lucide-react";

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

      {/* Split-screen hero */}
      <section className="relative grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        {/* Left: copy */}
        <div className="relative flex items-center px-6 sm:px-12 lg:px-16 py-16 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-8 font-medium">
              An Evening, Curated
            </p>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-ink">
              A Taste of{" "}
              <em className="text-gradient-sunset">Special</em>
              <br />
              Conventions
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-md">
              Send invitations, gather RSVPs, and let guests pre-order from
              hand-picked restaurants — all in one luminous place.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0">
                  Start hosting
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/restaurants">
                <Button size="lg" variant="outline" className="px-8">
                  Browse restaurants
                </Button>
              </Link>
            </div>
            <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-sunset" />
              Drinks &amp; snacks provided at every gathering
            </div>
          </div>
        </div>

        {/* Right: gradient canvas */}
        <div className="relative bg-gradient-sunset overflow-hidden min-h-[60vh] lg:min-h-full">
          {/* Soft orbs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-iris/50 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-magenta/40 blur-3xl" />

          {/* Floating invitation card */}
          <div className="relative h-full flex items-center justify-center p-10">
            <div className="w-full max-w-sm bg-card/95 backdrop-blur-xl rounded-2xl shadow-elegant p-8 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
              <p className="text-[10px] uppercase tracking-[0.4em] text-magenta mb-4">You're invited</p>
              <h3 className="font-display text-4xl text-ink leading-none mb-1">
                Saturday<br />
                <em className="text-gradient-sunset">Sundown</em>
              </h3>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-sunset" /> 7:00 PM · Evening</div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-sunset" /> The Conservatory</div>
                <div className="flex items-center gap-2"><Utensils className="w-3.5 h-3.5 text-sunset" /> Three featured restaurants</div>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">RSVP</span>
                <div className="w-8 h-8 rounded-full bg-gradient-sunset flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video intro placeholder */}
      <section className="mx-auto max-w-6xl px-6 pt-24">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">A First Look</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Watch the intro</h2>
          <p className="mt-3 text-muted-foreground">Your event film will live here — drop in the final cut when it's ready.</p>
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
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-ink/60 backdrop-blur-md text-cream/90 text-[10px] uppercase tracking-[0.3em] border border-cream/20">
            16 : 9 · Replace me
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">Event Essentials</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Everything your guests need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-card rounded-2xl border border-border p-7 hover:shadow-elegant hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white"
                style={{ background: gradients[i % gradients.length] }}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-3xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Duplicate detection callout */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden bg-ink text-cream rounded-3xl p-10 sm:p-14 grid md:grid-cols-2 gap-8 items-center">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-sunset opacity-30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-iris/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-glow mb-4">Built for collaboration</p>
            <h2 className="font-display text-5xl sm:text-6xl mb-4">No guest invited twice.</h2>
            <p className="text-cream/80 leading-relaxed">
              Multiple hosts can send invitations in parallel. We cross-reference
              every email and phone number across the entire guest list and flag
              duplicates instantly.
            </p>
          </div>
          <div className="relative space-y-3">
            {[
              "Email match detection",
              "Phone number normalization",
              "Per-event guest registry",
              "Live duplicate alerts on your dashboard",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 px-4 py-3 bg-cream/5 rounded-xl border border-cream/10">
                <ShieldCheck className="w-4 h-4 text-amber-glow shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p className="font-display text-2xl text-ink">A Taste of Special Conventions</p>
        <p className="mt-2">An invitation worth remembering.</p>
      </footer>
    </div>
  );
}

const gradients = [
  "linear-gradient(135deg, #ff6b35, #f7931e)",
  "linear-gradient(135deg, #f7931e, #e84393)",
  "linear-gradient(135deg, #e84393, #6c5ce7)",
  "linear-gradient(135deg, #6c5ce7, #ff6b35)",
  "linear-gradient(135deg, #ff6b35, #e84393)",
  "linear-gradient(135deg, #f7931e, #6c5ce7)",
];

const features = [
  { icon: Calendar, title: "Date & Time", body: "Set your event date, time and timezone — clear for in-person, virtual or hybrid attendees." },
  { icon: MapPin, title: "Location", body: "Display a physical venue, a virtual link, or both. Whatever fits the moment." },
  { icon: Utensils, title: "Curated Menus", body: "Connect multiple restaurants. Guests browse menus and pre-order before arrival." },
  { icon: Users, title: "Collaborative Invites", body: "Multiple hosts. One guest list. Zero duplicates — automatically." },
  { icon: ShieldCheck, title: "RSVP Magic Links", body: "Guests respond from a personal link — no account required." },
  { icon: Sparkles, title: "Dietary Notes", body: "Allergens, preferences and party size captured upfront." },
];
