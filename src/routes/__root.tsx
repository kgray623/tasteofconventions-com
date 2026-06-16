import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { registerPwa } from "@/pwa-register";

const clientStartupRecoveryScript = `
(() => {
  const marker = "lovable-client-startup-retry";
  const shouldRecover = (value) => /Failed to fetch dynamically imported module|virtual:tanstack-start-client-entry|Importing a module script failed/i.test(String(value || ""));
  const recover = (reason) => {
    if (!shouldRecover(reason) || sessionStorage.getItem(marker) === "1") return;
    sessionStorage.setItem(marker, "1");
    setTimeout(() => window.location.reload(), 800);
  };
  window.addEventListener("unhandledrejection", (event) => recover(event.reason && (event.reason.message || event.reason)));
  window.addEventListener("error", (event) => recover(event.message || event.error));
  window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem(marker), 12000));
})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-display text-foreground">Not on the guest list</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist — or hasn't been invited yet.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display text-foreground">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#58141C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Taste" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "A Taste of Special Conventions — Invitations & RSVP" },
      { name: "description", content: "RSVP this event includes cultural restaurant ordering for an unforgettable evening of conventions, cultures and cuisine." },
      { property: "og:title", content: "A Taste of Special Conventions — Invitations & RSVP" },
      { property: "og:description", content: "RSVP this event includes cultural restaurant ordering for an unforgettable evening of conventions, cultures and cuisine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "A Taste of Special Conventions — Invitations & RSVP" },
      { name: "twitter:description", content: "RSVP this event includes cultural restaurant ordering for an unforgettable evening of conventions, cultures and cuisine." },
      { property: "og:image", content: "https://tasteofconventions.com/__l5e/assets-v1/ff94b5e7-958c-4973-a8c6-ff8f38b66ade/og-share.png" },
      { property: "og:image:width", content: "1536" },
      { property: "og:image:height", content: "1024" },
      { name: "twitter:image", content: "https://tasteofconventions.com/__l5e/assets-v1/ff94b5e7-958c-4973-a8c6-ff8f38b66ade/og-share.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icon-180.png" },
      { rel: "apple-touch-icon", sizes: "167x167", href: "/icon-167.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/icon-152.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/icon-120.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap" },
    ],

    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "A Taste of Special Conventions",
          url: "https://tasteofconventions.com/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "A Taste of Special Conventions",
          url: "https://tasteofconventions.com/",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: clientStartupRecoveryScript }} />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
