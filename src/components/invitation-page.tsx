import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { EntertainmentSubmissionForm } from "@/components/entertainment-submission-form";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
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
  
  Heart,
  Wine,
  Plus,
  HandHeart,
  Trash2,
} from "lucide-react";

type Stop = { country: string; when: string; note: string; restaurant: boolean };
type Content = {
  hero_eyebrow: string;
  hero_title: string;
  hero_title_emphasis: string;
  hero_title_suffix: string;
  hero_tagline: string;
  hero_intro: string;
  video_url: string | null;
  itinerary: Stop[];
  datetime_heading: string;
  datetime_body: string;
  location_name: string;
  location_subtitle: string;
  location_body: string;
  dress_body: string;
  gifts_body: string;
};

const tabs = [
  { id: "datetime", label: "Date & Time" },
  { id: "location", label: "Location" },
  { id: "dress", label: "Dress Code" },
  { id: "gifts", label: "Gift Exchanges" },
  { id: "entertainment", label: "Entertainment" },
];

const defaultContent: Content = {
  hero_eyebrow: "You're Cordially Invited To",
  hero_title: "A Taste of",
  hero_title_emphasis: "Special",
  hero_title_suffix: "Conventions",
  hero_tagline: "An event and an evening to remember.",
  hero_intro:
    "You are cordially invited to join us for a very special evening of association, cultural enrichment, gift exchanges, meeting new friends, and making wonderful memories — this side of paradise. See the video for details.",
  video_url: null,
  itinerary: [],
  datetime_heading: "Sunday, August 30, 2026 · 4:00 PM – 9:30 PM",
  datetime_body: "Join us from 4:00 PM to 9:30 PM for a full evening together.",
  location_name: "Eagle's Landing",
  location_subtitle: "La Platte, Nebraska",
  location_body: "GPS coordinates and map will appear here once confirmed.",
  dress_body:
    "This is an international event, so international attire is encouraged. Is there a culture you love to dress in? Please do — it'll make the evening more fun and beautiful for everyone.",
  gifts_body:
    "In the spirit of the special and international conventions, friends bring gifts to exchange. See the video below — it'll walk you through exactly how it works.",
};

export function InvitationPage() {
  const [content, setContent] = useState<Content>(defaultContent);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; name: string }[]>([]);
  const { isAdmin } = useRoles();


  useEffect(() => {
    supabase.from("invitation_content").select("*").limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const row = data as unknown as Content;
          setContent({
            ...row,
            itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
          });
        }
      });
    supabase
      .from("categories")
      .select("id,name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setAssignments(data as { id: string; name: string }[]);
      });
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
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-magenta mb-8 font-medium whitespace-nowrap">
              {content.hero_eyebrow}
            </p>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl text-ink leading-[0.95]">
              {content.hero_title}{" "}
              <em className="text-gradient-sunset">{content.hero_title_emphasis}</em>
              <br />
              {content.hero_title_suffix}
            </h1>
            <p className="mt-6 font-display italic text-3xl sm:text-4xl text-ink/80">
              {content.hero_tagline}
            </p>
            <p className="mt-6 text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-xl whitespace-pre-line">
              {content.hero_intro}
            </p>
          </div>
        </div>

        <div className="relative bg-gradient-sunset overflow-hidden min-h-[60vh] lg:min-h-full flex items-center justify-center p-6 sm:p-10">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-glow/40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-iris/50 blur-3xl" />
          <div className="relative w-full max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-cream/90 mb-3 text-center">For Details · Watch the Invitation</p>
            {content.video_url ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-cream/20 bg-ink/40 backdrop-blur-md shadow-elegant">
                <iframe
                  src={content.video_url}
                  title="Invitation video"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-cream/20 shadow-elegant">
                <VideoPlaceholder label="Invitation video · coming soon" />
              </div>
            )}
          </div>
        </div>
      </section>



      {/* Conventions & Countries — prominent, always-visible section */}
      <section id="itinerary" className="mx-auto max-w-3xl px-6 pt-16">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-3">Step One</p>
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3 flex items-center justify-center gap-2">
            <Globe2 className="w-4 h-4" /> Conventions, Countries, and Cuisine
          </p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">A Journey Together</h2>
          <p className="mt-4 text-muted-foreground">
            Join us as we journey through four special conventions and as we do, you can taste the culture's cuisine from local restaurants as an option for a fuller experience. Catered meals will be in the $25.00 range per meal. Click below to reserve a meal so we can negotiate with the restaurants once we have a count. You will be updated with the menu in the coming weeks, and to pay the restaurant direct.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-elegant p-6 sm:p-8">
          <ol className="relative border-l-2 border-dashed border-border ml-3 space-y-6">
            {content.itinerary.map((stop, i) => (
              <li key={`${stop.country}-${i}`} className="relative pl-6">
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
                  <Link to="/preorder" className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-gradient-sunset text-white text-[10px] uppercase tracking-widest shadow-glow hover:opacity-90 transition">
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
        </div>
      </section>

      {/* RSVP — primary call to action */}
      <section id="rsvp-cta" className="mx-auto max-w-3xl px-6 pt-16">
        <div className="rounded-3xl border border-border bg-card shadow-elegant p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-amber-glow/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-iris/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.4em] text-magenta mb-3">Step Two</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-4">RSVP</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-3">
              Please RSVP if you want to join us in person or virtually including your party size. In person space is limited to 550. RSVP is first reserved. Once the in-person space is spoken for, a waiting list will be made in case of cancellations. Virtual attendance is unlimited.
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-magenta mb-7">
              Space is limited
            </p>

            <Link to="/rsvp">
              <Button
                size="lg"
                className="bg-gradient-sunset text-white hover:opacity-90 px-8 shadow-glow border-0"
              >
                Click here to RSVP
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <LoggedInRsvpCta />
          </div>
        </div>
      </section>

      {/* Accordion details */}
      <section id="details" className="mx-auto max-w-3xl px-6 py-16 mt-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-magenta mb-3">For more details, see the following</p>
          <h2 className="font-display text-5xl sm:text-6xl text-ink">Tap to open</h2>
          <p className="mt-4 text-muted-foreground">
            See the drop down information for FAQ of date, time, location, dress code, gift exchanges, entertainment, donations, adult beverages, volunteering, etc.
          </p>
        </div>

        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-3">
          {/* Date & Time */}
          <AccordionItem value="datetime" id="datetime" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Clock className="w-5 h-5 text-sunset" /> Date & Time
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-2">
              <p><strong className="text-ink">{content.datetime_heading}</strong></p>
              <p className="whitespace-pre-line">{content.datetime_body}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" id="location" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <MapPin className="w-5 h-5 text-sunset" /> Location
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-3">
              <p><strong className="text-ink">{content.location_name}</strong> · {content.location_subtitle}</p>
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-border">
                <iframe
                  title="Falconwood Park on Google Maps"
                  src="https://www.google.com/maps?q=Falconwood+Park+Bellevue+Nebraska&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                />
              </div>
              <p className="text-sm whitespace-pre-line">{content.location_body}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Dress */}
          <AccordionItem value="dress" id="dress" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Shirt className="w-5 h-5 text-sunset" /> Dress Code
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p className="whitespace-pre-line">{content.dress_body}</p>
              <VideoPlaceholder label="Dress code · video coming soon" />
            </AccordionContent>
          </AccordionItem>


          {/* Gifts */}
          <AccordionItem value="gifts" id="gifts" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Gift className="w-5 h-5 text-sunset" /> Gift Exchanges
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p className="whitespace-pre-line">{content.gifts_body}</p>
              <VideoPlaceholder label="Gift exchanges · video coming soon" />
            </AccordionContent>
          </AccordionItem>


          {/* Entertainment */}
          <AccordionItem value="entertainment" id="entertainment" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Music className="w-5 h-5 text-sunset" /> Entertainment
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-4">
              <p>
                Entertainment will be provided, so if you have a talent you want to share, please submit a video and we'll reach out to discuss the opportunity to perform.
              </p>
              <EntertainmentSubmissionForm />
            </AccordionContent>
          </AccordionItem>

          {/* Donations */}
          <AccordionItem value="donations" id="donations" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Heart className="w-5 h-5 text-sunset" /> Donations
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-2">
              <p>
                With many expenses putting on a large event, donations are
                greatly appreciated. Please text Kari Gray at 808.278.7562 to
                discuss making a donation by PayPal or in-person.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Food */}
          <AccordionItem value="food" id="food" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <UtensilsCrossed className="w-5 h-5 text-sunset" /> Food
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-3">
              <p className="whitespace-pre-line">
                Please bring finger food to share, and if you're ordering a
                restaurant catered meal, these will be available on the premises.
              </p>
              {isAdmin && (
                <Link to="/admin/invitation">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add content
                  </Button>
                </Link>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Volunteer */}
          <AccordionItem value="volunteer" id="volunteer" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <HandHeart className="w-5 h-5 text-sunset" /> Volunteer
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-3">
              <p>
                Want to volunteer for the event? Please send a text to Kari Gray
                at 808.278.7562 with YOUR NAME and the word VOLUNTEER to sign
                up.
              </p>
              {assignments.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {assignments.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 group">
                      <span>{c.name}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete "${c.name}"?`)) return;
                            const { error } = await supabase.from("categories").delete().eq("id", c.id);
                            if (error) return;
                            setAssignments((prev) => prev.filter((x) => x.id !== c.id));
                          }}
                          className="text-muted-foreground hover:text-terracotta opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="italic">Assignment list loading…</p>
              )}
              <p className="text-sm">
                You can sign up by texting your name to 808.278.7562 with the word VOLUNTEER.
              </p>

            </AccordionContent>
          </AccordionItem>


          {/* Adult Beverages */}
          <AccordionItem value="adult-beverages" id="adult-beverages" className="border border-border rounded-2xl bg-card px-5 data-[state=open]:shadow-elegant">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-2xl">
                <Wine className="w-5 h-5 text-sunset" /> Adult Beverages
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-muted-foreground space-y-2">
              <p>Adult beverages will be available for purchase from the venue. Bringing alcohol is not allowed and is strctly prohibited.</p>
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


function LoggedInRsvpCta() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return (
    <div className="mb-4">
      <Link to="/my-rsvp">
        <Button
          size="lg"
          variant="outline"
          className="border-ink text-ink hover:bg-ink hover:text-cream px-8"
        >
          Click here to update my RSVP
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}
