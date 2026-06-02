import { createFileRoute } from "@tanstack/react-router";
import { InvitationPage } from "@/components/invitation-page";

const eventLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "A Taste of Special Conventions",
  startDate: "2026-08-30T16:00:00-05:00",
  endDate: "2026-08-30T21:30:00-05:00",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: "Eagle's Landing",
    address: {
      "@type": "PostalAddress",
      addressLocality: "La Platte",
      addressRegion: "NE",
      addressCountry: "US",
    },
  },
  description:
    "An evening of association, gift exchanges, cultural cuisine, and wonderful memories.",
  url: "https://tasteofconventions.com/",
};

const invitationHead = () => ({
  meta: [
    { title: "An Evening to Remember · A Taste of Special Conventions" },
    {
      name: "description",
      content:
        "You're cordially invited to A Taste of Special Conventions on August 30, 2026 — an evening of association, gift exchanges, cultural cuisine, and wonderful memories at Eagle's Landing.",
    },
    { property: "og:title", content: "You're invited — A Taste of Special Conventions" },
    {
      property: "og:description",
      content:
        "Sunday, August 30, 2026 at Eagle's Landing. An evening of association, gift exchanges, and cultural cuisine.",
    },
    { property: "og:url", content: "https://tasteofconventions.com/" },
  ],
  scripts: [
    {
      type: "application/ld+json",
      children: JSON.stringify(eventLd),
    },
  ],
});

export const Route = createFileRoute("/")({
  head: invitationHead,
  component: InvitationPage,
});
