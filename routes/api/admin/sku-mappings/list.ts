/**
 * SKU Mappings List API
 * GET /api/admin/sku-mappings/list
 * Staff-only: List all Shopify SKU to plan mappings
 * ~50 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { getAllSKUMappings, getCacheStatus } from "../../../../lib/services/sku-mapping-service.ts";

export const handler: Handlers = {
  async GET(req) {
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

    // 3. Get all SKU mappings
    try {
      const mappings = await getAllSKUMappings();
      const cacheStatus = getCacheStatus();

      return Response.json({
        mappings,
        total: mappings.length,
        active: mappings.filter(m => m.is_active).length,
        cache: cacheStatus,
      });
    } catch (error) {
      console.error("Error fetching SKU mappings:", error);
      return Response.json({ error: "Failed to fetch mappings" }, { status: 500 });
    }
  },
};
