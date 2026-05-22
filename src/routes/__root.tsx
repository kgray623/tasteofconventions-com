import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

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
      { title: "A Taste of Special Conventions — Invitations & RSVP" },
      { name: "description", content: "Curated invitations, RSVPs, and restaurant ordering for an unforgettable evening." },
      { property: "og:title", content: "A Taste of Special Conventions — Invitations & RSVP" },
      { property: "og:description", content: "Curated invitations, RSVPs, and restaurant ordering for an unforgettable evening." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "A Taste of Special Conventions — Invitations & RSVP" },
      { name: "twitter:description", content: "Curated invitations, RSVPs, and restaurant ordering for an unforgettable evening." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f65920ca-cff0-44b7-b414-1c27df80c848/id-preview-c867cc3f--e8411fba-4f86-4ec1-8aae-cc2299e2724a.lovable.app-1779320118081.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f65920ca-cff0-44b7-b414-1c27df80c848/id-preview-c867cc3f--e8411fba-4f86-4ec1-8aae-cc2299e2724a.lovable.app-1779320118081.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap" },
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
