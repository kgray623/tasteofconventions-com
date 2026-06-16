import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CommitteeWorkspace } from "@/components/committee-workspace";

export const Route = createFileRoute("/_authenticated/admin/subcommittee")({
  head: () => ({ meta: [{ title: "Steering Committee — A Taste of Special Conventions" }] }),
  validateSearch: (s) => z.object({ chat: z.string().optional(), view: z.enum(["committee"]).optional() }).parse(s),
  component: CommitteeWorkspace,
});
