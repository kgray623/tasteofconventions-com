import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hand, ArrowLeft, Check } from "lucide-react";
import {
  listVolunteerCategories,
  volunteerSignUp,
  volunteerWithdraw,
  type VolunteerCategory,
} from "@/lib/volunteer.functions";

export const Route = createFileRoute("/_authenticated/volunteer")({
  head: () => ({
    meta: [
      { title: "Volunteer — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Sign up to help with A Taste of Special Conventions — set up, clean up, hospitality and more.",
      },
      { property: "og:title", content: "Volunteer — A Taste of Special Conventions" },
      {
        property: "og:description",
        content: "Choose a volunteer role for A Taste of Special Conventions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VolunteerPage,
});

function VolunteerPage() {
  const load = useServerFn(listVolunteerCategories);
  const signUp = useServerFn(volunteerSignUp);
  const withdraw = useServerFn(volunteerWithdraw);
  const [cats, setCats] = useState<VolunteerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setCats(await load());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load volunteer roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggle = async (cat: VolunteerCategory) => {
    setBusy(cat.id);
    try {
      if (cat.mine && cat.my_assignment_id) {
        await withdraw({ data: { assignmentId: cat.my_assignment_id } });
        toast.success(`Removed from ${cat.name}.`);
      } else {
        await signUp({ data: { categoryId: cat.id } });
        toast.success(`You're signed up for ${cat.name}. Thank you!`);
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't save. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const mine = cats.filter((c) => c.mine);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <Link to="/my-rsvp" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to my RSVP
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl">Volunteer</h1>
        <p className="text-muted-foreground text-sm">
          Tap a role to sign up. You can pick more than one, and you can remove yourself any time.
        </p>
      </header>

      {mine.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium">You're signed up for</div>
          <div className="flex flex-wrap gap-2">
            {mine.map((c) => (
              <Badge key={c.id} className="bg-terracotta text-cream">
                {c.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-8 text-muted-foreground">Loading roles…</div>
      ) : cats.length === 0 ? (
        <Card className="p-6 text-muted-foreground">No volunteer roles have been posted yet.</Card>
      ) : (
        <div className="space-y-3">
          {cats.map((cat) => (
            <Card key={cat.id} className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl leading-tight">{cat.name}</h2>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {cat.volunteer_count} signed up
                  </span>
                </div>
                {cat.description && (
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                )}
              </div>
              <Button
                onClick={() => toggle(cat)}
                disabled={busy === cat.id}
                variant={cat.mine ? "outline" : "default"}
                className={
                  cat.mine
                    ? "w-full"
                    : "w-full bg-terracotta text-cream hover:bg-terracotta/90"
                }
              >
                {cat.mine ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> You're in — tap to remove
                  </>
                ) : (
                  <>
                    <Hand className="w-4 h-4 mr-2" /> Count me in
                  </>
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
