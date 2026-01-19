/**
 * Simple Parent PIN Verification API
 * Verifies PIN against ANY parent in the family (for kid removal, settings access)
 * Uses lightweight verification to avoid bcrypt hanging issues
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../lib/auth/session.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const session = await getAuthenticatedSession(req);

      if (!session.isAuthenticated || !session.family) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { pin, parent_id } = await req.json();

      if (!pin) {
        return new Response(JSON.stringify({ error: "PIN required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const choreService = new ChoreService();

      // If parent_id provided, verify against that specific parent
      // Otherwise, verify against ANY parent in the family
      if (parent_id) {
        console.log(`🔧 Simple PIN verification for specific parent: ${parent_id}`);
        const parent = await choreService.getFamilyMember(parent_id);

        if (!parent || parent.role !== 'parent') {
          return new Response(JSON.stringify({ error: "Parent not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify parent belongs to authenticated family
        if (parent.family_id !== session.family.id) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        const isValid = verifyPinForParent(parent, pin);
        return new Response(JSON.stringify({
          success: isValid,
          message: isValid ? "PIN verified" : "Invalid PIN"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // No parent_id - verify PIN against ANY parent in the family
      console.log(`🔧 Verifying PIN against any parent in family: ${session.family.id}`);
      const members = await choreService.getFamilyMembers(session.family.id);
      const parents = members.filter(m => m.role === 'parent');

      if (parents.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "No parents found in family"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check PIN against each parent - succeed if ANY match
      for (const parent of parents) {
        if (verifyPinForParent(parent, pin)) {
          console.log(`✅ PIN matched for parent: ${parent.name}`);
          return new Response(JSON.stringify({
            success: true,
            message: "PIN verified"
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      console.log(`❌ PIN did not match any parent in family`);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid PIN"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("❌ Error in simple PIN verification:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Verification failed"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

/**
 * Verify PIN for a single parent
 * Returns true if PIN matches, false otherwise
 */
function verifyPinForParent(parent: { pin_hash?: string; name: string }, pin: string): boolean {
  if (!parent.pin_hash) {
    console.log(`⚠️ No PIN set for parent: ${parent.name}`);
    return false;
  }

  // Check if pin_hash is actually a bcrypt hash (starts with $2) or plaintext
  if (parent.pin_hash.startsWith('$2')) {
    console.log(`⚠️ Found bcrypt hash for ${parent.name}, needs re-setup`);
    // For existing bcrypt hashes, we need to clear them and ask for re-setup
    // This avoids the hanging bcrypt issue entirely
    return false;
  }

  // Plaintext PIN comparison
  return parent.pin_hash === pin;
}