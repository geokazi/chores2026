/**
 * Daily Digest Cron Trigger
 * HTTP fallback for Deno.cron — used by external schedulers.
 * GET /api/cron/daily-digest?secret=CRON_SECRET
 */

import { Handlers } from "$fresh/server.ts";
import { sendDailyDigests } from "../../../lib/services/email-digest.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || secret !== cronSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[api/cron/daily-digest] Manual trigger at:", new Date().toISOString());

    try {
      const result = await sendDailyDigests();
      return Response.json(result);
    } catch (err) {
      console.error("[api/cron/daily-digest] Failed:", err);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  },
};
