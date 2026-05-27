import { createFileRoute } from "@tanstack/react-router";
import { MyRsvpContent } from "@/components/my-rsvp-content";

export const Route = createFileRoute("/my-rsvp")({
  head: () => ({ meta: [{ title: "My RSVP — A Taste of Special Conventions" }] }),
  component: MyRsvpPage,
});

function MyRsvpPage() {
  return (
    <div className="min-h-screen bg-gradient-warm px-6 py-10">
      <MyRsvpContent />
    </div>
  );
}
