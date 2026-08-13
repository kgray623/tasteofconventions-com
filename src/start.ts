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

    // Server-function calls expect a machine-readable body. Returning the HTML
    // error page here made the client throw while parsing the response, which
    // surfaced as a blank screen instead of the component's own error state.
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
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
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
