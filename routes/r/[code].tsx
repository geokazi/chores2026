/**
 * Short URL Redirect for Referral Codes
 * /r/ABC123 -> /register?ref=ABC123
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const code = ctx.params.code?.toUpperCase() || "";
    const redirectUrl = `/register?ref=${encodeURIComponent(code)}`;

    console.log("[Referral] Short URL redirect", { code, redirectUrl });

    // Redirect to registration with ref param
    // Validation happens at registration time
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  },
};
