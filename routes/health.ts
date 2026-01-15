// Health check endpoint for Fly.io monitoring
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const timestamp = new Date().toISOString();
    const region = Deno.env.get("FLY_REGION") || "local";
    const version = Deno.env.get("APP_VERSION") || "dev-local";
    
    return new Response(JSON.stringify({
      status: "healthy",
      service: "choregami-2026",
      timestamp,
      version,
      region,
      environment: Deno.env.get("DENO_ENV") || "development",
      uptime: performance.now()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
};