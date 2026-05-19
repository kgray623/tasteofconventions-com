import { createFileRoute } from "@tanstack/react-router";
import { InvitationPage } from "@/components/invitation-page";

const invitationHead = () => ({
  meta: [
    { title: "An Evening to Remember · A Taste of Special Conventions" },
    {
      name: "description",
      content:
        "You're cordially invited to A Taste of Special Conventions — an evening of association, gift exchanges, cultural enrichment, and wonderful memories.",
    },
  ],
});

export const Route = createFileRoute("/")({
  head: invitationHead,
  component: InvitationPage,
});
