import { createFileRoute } from "@tanstack/react-router";
import { Invitation } from "./index";

export const Route = createFileRoute("/index")({
  head: () => ({
    meta: [
      { title: "An Evening to Remember · A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "You're cordially invited to A Taste of Special Conventions — an evening of association, gift exchanges, cultural enrichment, and wonderful memories.",
      },
    ],
  }),
  component: Invitation,
});