/**
 * Set Kid PIN API
 * Save/update PIN for a kid profile
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req) {
    console.log("🔧 Set kid PIN API called");
    
    // Verify parent session
    const session = await getAuthenticatedSession(req);
    console.log("🔧 Session check:", {
      isAuthenticated: session.isAuthenticated,
      hasFamily: !!session.family,
      familyId: session.family?.id
    });
    
    if (!session.isAuthenticated || !session.family) {
      console.log("❌ Unauthorized access to set kid PIN API");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      console.log("🔧 Request body:", { ...body, pin: body.pin?.replace(/./g, '*') });
      
      const { kid_id, pin } = body;
      
      if (!kid_id || typeof kid_id !== "string") {
        console.log("❌ Missing or invalid kid_id");
        return new Response(JSON.stringify({ error: "kid_id is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!pin || typeof pin !== "string" || pin.length !== 4) {
        console.log("❌ Invalid PIN - must be 4 digits");
        return new Response(JSON.stringify({ error: "PIN must be exactly 4 digits" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate PIN contains only numbers
      if (!/^\d{4}$/.test(pin)) {
        console.log("❌ PIN contains non-numeric characters");
        return new Response(JSON.stringify({ error: "PIN must contain only numbers" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("🔧 Setting PIN for kid:", kid_id, "in family:", session.family.id);

      const choreService = new ChoreService();
      
      // Verify the kid belongs to this family
      const familyMembers = await choreService.getFamilyMembers(session.family.id);
      const kid = familyMembers.find(member => member.id === kid_id && member.role === 'child');
      
      if (!kid) {
        console.log("❌ Kid not found in family");
        return new Response(JSON.stringify({ error: "Kid not found in family" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const success = await choreService.setKidPin(kid_id, pin);

      console.log("🔧 ChoreService.setKidPin result:", success);

      if (!success) {
        console.log("❌ ChoreService returned false");
        return new Response(JSON.stringify({ error: "Failed to save PIN" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ Kid PIN saved successfully:", {
        kidId: kid_id,
        kidName: kid.name,
        family: session.family.name,
      });

      return new Response(JSON.stringify({ 
        success: true,
        message: "PIN saved successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error setting kid PIN:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};