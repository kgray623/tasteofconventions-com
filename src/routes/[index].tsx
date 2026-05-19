import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/index")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
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
  component: () => null,
});
