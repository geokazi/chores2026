/**
 * Create Family API - Creates family + parent profile for new users
 * Called from /setup after authentication
 * ~55 lines - respects 500 line limit
 */

import { Handlers } from "$fresh/server.ts";
import { getCookies } from "@std/http/cookie";
import { getServiceSupabaseClient } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req) {
    console.log("🔧 Create family API called");

    try {
      // 1. Verify authentication
      const cookies = getCookies(req.headers);
      const accessToken = cookies["sb-access-token"];

      console.log("🔧 Access token present:", !!accessToken);

      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabase = getServiceSupabaseClient();

      // 2. Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      console.log("🔧 Auth result:", { userId: user?.id, authError: authError?.message });

      if (authError || !user) {
        console.error("🔧 Auth failed:", authError);
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
      console.log("🔧 Creating family:", familyName.trim());
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({
          name: familyName.trim(),
          settings: { _version: 1 },
        })
        .select("id")
        .single();

      console.log("🔧 Family creation result:", { familyId: family?.id, error: familyError?.message });

      if (familyError || !family) {
        console.error("Failed to create family:", familyError);
        return new Response(JSON.stringify({ error: `Failed to create family: ${familyError?.message || 'unknown'}` }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Create parent profile linked to auth user
      console.log("🔧 Creating profile:", { familyId: family.id, userId: user.id, name: parentName.trim() });
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

      console.log("🔧 Profile creation result:", { error: profileError?.message });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Rollback: delete the family we just created
        await supabase.from("families").delete().eq("id", family.id);
        return new Response(JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }), {
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
