/**
 * Manage Parent API - Remove co-parents (not the owner)
 * Owner is stored in families.settings.owner_user_id
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { createClient } from "@supabase/supabase-js";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only parents can manage other parents
    if (session.user.role !== "parent") {
      return Response.json({ error: "Only parents can manage family members" }, { status: 403 });
    }

    try {
      const { action, profile_id } = await req.json();
      const familyId = session.family.id;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // REMOVE PARENT (soft delete)
      if (action === "remove") {
        if (!profile_id) {
          return Response.json({ error: "profile_id required" }, { status: 400 });
        }

        // Get the parent profile to remove
        const { data: targetProfile, error: profileError } = await supabase
          .from("family_profiles")
          .select("id, name, user_id, role")
          .eq("id", profile_id)
          .eq("family_id", familyId)
          .eq("is_deleted", false)
          .single();

        if (profileError || !targetProfile) {
          return Response.json({ error: "Parent not found" }, { status: 404 });
        }

        if (targetProfile.role !== "parent") {
          return Response.json({ error: "Use manage-kid API for children" }, { status: 400 });
        }

        // Get family owner from settings
        const ownerUserId = session.family.settings?.owner_user_id;

        // Check if target is the owner
        if (targetProfile.user_id === ownerUserId) {
          return Response.json({
            error: "Cannot remove the family owner. Transfer ownership first."
          }, { status: 403 });
        }

        // Soft delete the parent profile
        const { error: deleteError } = await supabase
          .from("family_profiles")
          .update({ is_deleted: true })
          .eq("id", profile_id);

        if (deleteError) {
          console.error("❌ Failed to remove parent:", deleteError);
          return Response.json({ error: "Failed to remove parent" }, { status: 500 });
        }

        console.log("✅ Parent removed (soft delete):", targetProfile.name);
        return Response.json({ success: true });
      }

      return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
      console.error("❌ Manage parent error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
