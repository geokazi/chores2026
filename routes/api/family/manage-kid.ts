/**
 * Manage Kid API - Add, Edit, Remove kids
 * Single endpoint for all kid management operations
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.family) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { action, kid_id, name } = await req.json();
      const choreService = new ChoreService();
      const familyId = session.family.id;

      // ADD KID
      if (action === "add") {
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const kid = await choreService.addKid(familyId, name);
        if (!kid) {
          return new Response(JSON.stringify({ error: "Failed to add kid (max 8 reached?)" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log("✅ Kid added:", kid.name);
        return new Response(JSON.stringify({ success: true, kid }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // EDIT KID NAME
      if (action === "edit") {
        if (!kid_id || !name || name.trim().length === 0) {
          return new Response(JSON.stringify({ error: "kid_id and name required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify kid belongs to family
        const members = await choreService.getFamilyMembers(familyId);
        const kid = members.find(m => m.id === kid_id && m.role === "child");
        if (!kid) {
          return new Response(JSON.stringify({ error: "Kid not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const success = await choreService.updateKidName(kid_id, name);
        if (!success) {
          return new Response(JSON.stringify({ error: "Failed to update name" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log("✅ Kid renamed:", name);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // REMOVE KID (soft delete)
      if (action === "remove") {
        if (!kid_id) {
          return new Response(JSON.stringify({ error: "kid_id required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify kid belongs to family
        const members = await choreService.getFamilyMembers(familyId);
        const kid = members.find(m => m.id === kid_id && m.role === "child");
        if (!kid) {
          return new Response(JSON.stringify({ error: "Kid not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const success = await choreService.softDeleteKid(kid_id);
        if (!success) {
          return new Response(JSON.stringify({ error: "Failed to remove kid" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log("✅ Kid removed (soft delete):", kid.name);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Manage kid error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
