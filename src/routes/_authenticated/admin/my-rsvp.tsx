import { createFileRoute } from "@tanstack/react-router";
import { MyRsvpContent } from "@/components/my-rsvp-content";

export const Route = createFileRoute("/_authenticated/admin/my-rsvp")({
  head: () => ({ meta: [{ title: "My RSVP — Steering Committee" }] }),
  component: () => <MyRsvpContent />,
});
