import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — A Taste of Special Conventions" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return <Navigate to="/login" replace />;
}
