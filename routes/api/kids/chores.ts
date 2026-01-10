/**
 * Secure Kid Chores API (Session-Based)
 * Gets chores for active kid without exposing GUIDs
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req) {
    // SECURITY: Verify parent session first
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      // Get kid ID from request body (not URL)
      const { kidId } = await req.json();
      
      if (!kidId) {
        return new Response(
          JSON.stringify({ error: "Kid ID required" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const choreService = new ChoreService();
      
      // Verify kid belongs to authenticated family
      const kid = await choreService.getFamilyMember(kidId);
      if (!kid || kid.family_id !== parentSession.family.id) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { 
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Get today's chores for this kid
      const todaysChores = await choreService.getTodaysChores(
        kidId,
        parentSession.family.id,
      );

      return new Response(
        JSON.stringify(todaysChores),
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Error fetching kid chores:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chores" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};