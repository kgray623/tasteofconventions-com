import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/lib/attach-supabase-auth";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);

    // Server-function calls normally use TanStack's serialized response type.
    // Do not label an un-serialized failure as JSON: the client fetcher treats
    // JSON error responses as successful return values before checking status.
    // Plain text preserves the 500 as a thrown Error so client middleware can
    // recover a tab whose build-specific server-function IDs became stale.
    let isServerFn = false;
    try {
      const request = getRequest();
      const url = request?.url ? new URL(request.url) : null;
      isServerFn = !!url && url.pathname.startsWith("/_serverFn/");
    } catch {
      isServerFn = false;
    }

    if (isServerFn) {
      const message = error instanceof Error ? error.message : "Server request failed.";
      return new Response(message, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});


export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
