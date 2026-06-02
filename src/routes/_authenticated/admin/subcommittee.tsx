import { createFileRoute } from "@tanstack/react-router";
import { CommitteeWorkspace } from "@/components/committee-workspace";

export const Route = createFileRoute("/_authenticated/admin/subcommittee")({
  head: () => ({ meta: [{ title: "Steering Committee — A Taste of Special Conventions" }] }),
  component: CommitteeWorkspace,
});