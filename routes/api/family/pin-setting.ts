/**
 * Family PIN Setting API
 * Toggle PIN requirement for kids in the family
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req) {
    console.log("🔧 PIN setting API called");
    
    // Verify parent session
    const session = await getAuthenticatedSession(req);
    console.log("🔧 Session check:", {
      isAuthenticated: session.isAuthenticated,
      hasFamily: !!session.family,
      familyId: session.family?.id
    });
    
    if (!session.isAuthenticated || !session.family) {
      console.log("❌ Unauthorized access to PIN setting API");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      console.log("🔧 Request body:", body);
      
      const { children_pins_enabled } = body;
      if (typeof children_pins_enabled !== "boolean") {
        console.log("❌ Invalid children_pins_enabled type:", typeof children_pins_enabled);
        return new Response(JSON.stringify({ error: "children_pins_enabled must be boolean" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("🔧 Updating family PIN setting:", {
        familyId: session.family.id,
        newSetting: children_pins_enabled
      });

      const choreService = new ChoreService();
      const success = await choreService.updateFamilyPinSetting(
        session.family.id,
        children_pins_enabled
      );

      console.log("🔧 ChoreService update result:", success);

      if (!success) {
        console.log("❌ ChoreService returned false");
        return new Response(JSON.stringify({ error: "Failed to update PIN setting" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ Family PIN setting updated successfully:", {
        family: session.family.name,
        pinsEnabled: children_pins_enabled,
      });

      return new Response(JSON.stringify({ 
        success: true,
        children_pins_enabled 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error updating family PIN setting:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};