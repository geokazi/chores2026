/**
 * Demand Signal API - Track interest in unreleased features
 * Public endpoint (no auth required) - anonymous demand tracking
 *
 * v1: Basic click tracking (feature, email, session_id)
 * v2: Assessment quiz results (+ assessment answers, result_type)
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Valid features to track
const VALID_FEATURES = ["roommates", "just_me"];

// Valid result types from assessment quiz
const VALID_RESULT_TYPES = [
  "fair_seeker", "peace_keeper", "system_builder", "optimizer",           // roommates
  "motivation_seeker", "overwhelmed_organizer", "memory_helper", "habit_builder" // just_me
];

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { v, feature, email, session_id, assessment, result_type } = body;

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

      // Build JSONB payload - supports both v1 and v2
      const data: Record<string, unknown> = {
        v: v || 1,
        feature,
        email: email || undefined,
        session_id: session_id || undefined,
        user_agent: req.headers.get("user-agent") || undefined,
        referrer: req.headers.get("referer") || undefined,
      };

      // v2: Include assessment data if provided
      if (assessment && typeof assessment === "object") {
        data.assessment = assessment;
      }
      if (result_type && VALID_RESULT_TYPES.includes(result_type)) {
        data.result_type = result_type;
      }

      // Insert into demand_signals table
      const client = createClient(supabaseUrl, supabaseKey);

      const { error } = await client
        .from("demand_signals")
        .insert({ data });

      if (error) {
        console.error("❌ Demand signal insert error:", error);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Demand signal tracked:", {
        feature,
        hasEmail: !!email,
        hasAssessment: !!assessment,
        resultType: result_type
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("❌ Demand signal error:", error);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
