/**
 * Weekly Digest - HTTP Fallback Trigger
 * GET /api/cron/weekly-digest?secret=CRON_SECRET
 * Authenticated via shared secret (not user session)
 * Dual-trigger: Deno.cron (primary) calls sendWeeklyDigests() directly,
 * this endpoint is the fallback for external cron services.
 */

import { Handlers } from "$fresh/server.ts";
import { sendWeeklyDigests } from "../../../lib/services/email-digest.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || secret !== cronSecret) {
      console.warn("[cron/weekly-digest] 401 - invalid secret from:", {
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        timestamp: new Date().toISOString(),
      });
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[cron/weekly-digest] HTTP fallback triggered at:", new Date().toISOString());

    try {
      const result = await sendWeeklyDigests();
      return Response.json({ success: true, ...result });
    } catch (error) {
      console.error("[cron/weekly-digest] Error:", error);
      return Response.json(
        { success: false, error: String(error) },
        { status: 500 },
      );
    }
  },
};
