import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — A Taste of Special Conventions" }] }),
  component: AuthPage,
});

function AuthPage() {
  return <Navigate to="/login" replace />;
}
