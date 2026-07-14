import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — A Taste of Special Conventions" }] }),
  component: ResetPasswordPage,
});

function getAuthParam(name: string) {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.get(name) ?? hash.get(name);
}

function ResetPasswordPage() {
  return <Navigate to="/login" replace />;
}
