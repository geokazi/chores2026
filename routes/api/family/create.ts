/**
 * Create Family API - Creates family + parent profile for new users
 * Called from /setup after authentication
 * ~55 lines - respects 500 line limit
 */

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import { getCookies } from "@std/http/cookie";

export const handler: Handlers = {
  async POST(req) {
    try {
      // 1. Verify authentication
      const cookies = getCookies(req.headers);
      const accessToken = cookies["sb-access-token"];

      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // 2. Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Check if user already has a profile (prevent duplicates)
      const { data: existingProfile } = await supabase
        .from("family_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .single();

      if (existingProfile) {
        return new Response(JSON.stringify({ error: "Profile already exists" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. Parse request body
      const { parentName, familyName } = await req.json();

      if (!parentName?.trim() || !familyName?.trim()) {
        return new Response(JSON.stringify({ error: "Name and family name required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. Create family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({
          name: familyName.trim(),
          settings: { _version: 1 },
        })
        .select("id")
        .single();

      if (familyError || !family) {
        console.error("Failed to create family:", familyError);
        return new Response(JSON.stringify({ error: "Failed to create family" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Create parent profile linked to auth user
      const { error: profileError } = await supabase
        .from("family_profiles")
        .insert({
          family_id: family.id,
          user_id: user.id,
          name: parentName.trim(),
          role: "parent",
          current_points: 0,
          is_deleted: false,
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Rollback: delete the family we just created
        await supabase.from("families").delete().eq("id", family.id);
        return new Response(JSON.stringify({ error: "Failed to create profile" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("Family created:", { familyId: family.id, parentName, familyName, userId: user.id });

      return new Response(JSON.stringify({ success: true, familyId: family.id }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Create family error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
