/**
 * SKU Mapping Delete API
 * POST /api/admin/sku-mappings/delete
 * Staff-only: Delete a SKU mapping (hard delete)
 * ~50 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { deleteSKUMapping } from "../../../../lib/services/sku-mapping-service.ts";

interface DeleteSKURequest {
  id: string;
}

export const handler: Handlers = {
  async POST(req) {
    // 1. Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Check staff access
    if (!isStaffEmail(session.user.email)) {
      console.log(`Unauthorized admin access attempt by ${session.user.email}`);
      return Response.json({
        error: "Staff access required",
        authorized_domains: ["@choregami.com", "@choregami.app", "@probuild365.com"],
      }, { status: 403 });
    }

    // 3. Parse and validate request body
    let body: DeleteSKURequest;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = body;

    if (!id) {
      return Response.json({ error: "Missing required field: id" }, { status: 400 });
    }

    // 4. Delete the mapping
    try {
      await deleteSKUMapping(id);

      console.log(`📦 SKU mapping deleted by ${session.user.email}: ${id}`);

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting SKU mapping:", error);
      return Response.json({ error: "Failed to delete mapping" }, { status: 500 });
    }
  },
};
