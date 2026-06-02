import { Link } from "@tanstack/react-router";
import { CalendarCog, ListChecks, MessageSquare, Upload, UserPlus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CommitteeWorkspace() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Watch the Welcome Video</h2>
        <Card className="overflow-hidden border-ink/10 bg-ink/5">
          <div className="relative aspect-[9/16] md:aspect-video mx-auto w-full max-w-sm md:max-w-none">
            <iframe
              src="https://fast.wistia.net/embed/iframe/cf8d380y2y?videoFoam=true"
              title="Steering Committee welcome video"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              scrolling="no"
            />
          </div>
        </Card>
      </div>

      <p className="text-muted-foreground">
        See the following where you can add your guests, chat with others, choose what to volunteer for, etc. If you have any issues with the platform, please screenshot it and text it to 808.278.7562.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start h-14">
          <Link to="/admin/categories" search={{ view: "committee" }}>
            <ListChecks className="w-4 h-4" /> Volunteer
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/upload" search={{ view: "committee" }}>
            <Upload className="w-4 h-4" /> Guest list / Add guests
          </Link>
        </Button>

        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/chat" search={{ view: "committee" }}>
            <MessageSquare className="w-4 h-4" /> Committee chat
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/" hash="datetime">
            <CalendarCog className="w-4 h-4" /> Event details
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/team" search={{ view: "committee" }}>
            <UserPlus className="w-4 h-4" /> Add committee member
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/preorders" search={{ view: "committee" }}>
            <Utensils className="w-4 h-4" /> Food report
          </Link>
        </Button>
      </div>
    </div>
  );
}