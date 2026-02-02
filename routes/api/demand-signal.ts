/**
 * Demand Signal API - Track interest in unreleased features
 * Public endpoint (no auth required) - anonymous demand tracking
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Valid features to track
const VALID_FEATURES = ["roommates", "just_me"];

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { feature, email, session_id } = body;

      // Validate feature
      if (!feature || !VALID_FEATURES.includes(feature)) {
        return new Response(
          JSON.stringify({ error: "Invalid feature" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Basic email validation if provided
      if (email && !email.includes("@")) {
        return new Response(
          JSON.stringify({ error: "Invalid email" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Build JSONB payload (same pattern as family_activity)
      const data = {
        v: 1, // Schema version
        feature,
        email: email || undefined,
        session_id: session_id || undefined,
        user_agent: req.headers.get("user-agent") || undefined,
        referrer: req.headers.get("referer") || undefined,
      };

      // Insert into demand_signals table
      const client = createClient(supabaseUrl, supabaseKey);

      const { error } = await client
        .from("demand_signals")
        .insert({ data });

      if (error) {
        console.error("❌ Demand signal insert error:", error);
        // Don't expose internal errors
        return new Response(
          JSON.stringify({ success: true }), // Still return success to client
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Demand signal tracked:", { feature, hasEmail: !!email });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("❌ Demand signal error:", error);
      // Return success anyway - don't block user experience
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
