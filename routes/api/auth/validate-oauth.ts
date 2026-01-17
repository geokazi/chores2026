/**
 * OAuth Validation API - Pre-check provider config
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req) {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider || !["google", "facebook"].includes(provider)) {
      return Response.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({
        provider,
        available: false,
        userMessage: `${provider} not configured. Use email or phone.`,
      });
    }

    if (provider === "google") {
      const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!googleClientId) {
        return Response.json({
          provider,
          available: false,
          userMessage: "Google not configured. Use email or phone.",
        });
      }
    }

    if (provider === "facebook") {
      const metaAppId = Deno.env.get("META_APP_ID") || Deno.env.get("FACEBOOK_APP_ID");
      if (!metaAppId) {
        return Response.json({
          provider,
          available: false,
          userMessage: "Facebook not configured. Use email or phone.",
        });
      }
    }

    return Response.json({ provider, available: true });
  },
};
