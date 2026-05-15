import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "An Evening to Remember · A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "You're cordially invited to A Taste of Special Conventions — an evening of association, gift exchanges, and wonderful memories.",
      },
    ],
  }),
  component: Invitation,
});

function Invitation() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero invitation */}
      <section className="relative grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        <div className="relative flex items-center px-6 sm:px-12 lg:px-16 py-16 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-8 font-medium">
              You're Cordially Invited
            </p>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-ink leading-[0.95]">
              A Taste of{" "}
              <em className="text-gradient-sunset">Special</em>
              <br />
              Conventions
            </h1>
            <p className="mt-6 font-display italic text-3xl sm:text-4xl text-ink/80">
              An evening to remember.
            </p>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-md">
              You're cordially invited to the Taste of Special Conventions
              event. Please join us for a special evening of association,
              gift exchanges, cultural enrichment, meeting new friends, and an
              evening of making wonderful memories — this side of paradise.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/rsvp/preview">
                <Button
                  size="lg"
                  className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0"
                >
                  RSVP — Click here
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="#details">
                <Button size="lg" variant="outline" className="px-8">
                  Find out more
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Right: invitation card */}
        <div className="relative bg-gradient-sunset overflow-hidden min-h-[60vh] lg:min-h-full">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-iris/50 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-magenta/40 blur-3xl" />

          <div className="relative h-full flex items-center justify-center p-10">
            <div className="w-full max-w-sm bg-card/95 backdrop-blur-xl rounded-2xl shadow-elegant p-8 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
              <p className="text-[10px] uppercase tracking-[0.4em] text-magenta mb-4">
                You're invited
              </p>
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
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  RSVP
                </span>
                <Link
                  to="/rsvp/preview"
                  className="w-8 h-8 rounded-full bg-gradient-sunset flex items-center justify-center"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* When & Where */}
      <section id="details" className="mx-auto max-w-5xl px-6 pt-24 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">
          When &amp; Where
        </p>
        <h2 className="font-display text-5xl sm:text-6xl text-ink leading-tight">
          You're cordially invited <em className="text-gradient-sunset">on Sunday</em>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          From <strong className="text-ink">4:00 to 9:00 PM</strong> at{" "}
          <strong className="text-ink">Eagle's Landing</strong> in La Platte.
          For all the details, watch the video below.
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/rsvp/preview">
            <Button
              size="lg"
              className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0"
            >
              Click here to RSVP
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Video intro placeholder */}
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">
            For Details · See the Video
          </p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">
            Watch the invitation
          </h2>
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

      {/* Need to knows */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">
            Need to Knows
          </p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">
            Everything you'll want to know
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {needToKnows.map((item, i) => (
            <div
              key={item.title}
              className="group bg-card rounded-2xl border border-border p-7 hover:shadow-elegant hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white"
                style={{ background: gradients[i % gradients.length] }}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-3xl mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Map placeholder */}
        <div className="mt-10 relative aspect-[16/7] rounded-3xl overflow-hidden border border-border bg-card shadow-elegant">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-glow/20 via-magenta/15 to-iris/20" />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6 gap-3">
            <MapPin className="w-10 h-10 text-sunset" />
            <p className="font-display text-3xl text-ink">Eagle's Landing · La Platte</p>
            <p className="text-sm text-muted-foreground">
              Map will appear here once the full address is confirmed.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p className="font-display text-2xl text-ink">
          A Taste of Special Conventions
        </p>
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
  "linear-gradient(135deg, #ff6b35, #e84393)",
  "linear-gradient(135deg, #f7931e, #6c5ce7)",
];

const needToKnows = [
  {
    icon: Calendar,
    title: "Date & Time",
    body: "Sunday, 4:00 – 9:00 PM. Exact date to be confirmed shortly.",
  },
  {
    icon: MapPin,
    title: "Location",
    body: "Eagle's Landing in La Platte. Full address and map coming soon.",
  },
  {
    icon: Shirt,
    title: "Attire",
    body: "Details on dress code will be shared here as the evening takes shape.",
  },
  {
    icon: Gift,
    title: "Gift Exchanges",
    body: "A warm tradition of giving — guidelines will appear here soon.",
  },
  {
    icon: Utensils,
    title: "Food Choices",
    body: "Menus and dietary options will be listed here before you RSVP.",
  },
  {
    icon: Music,
    title: "Entertainment",
    body: "Live music, surprises, and moments worth remembering.",
  },
];
