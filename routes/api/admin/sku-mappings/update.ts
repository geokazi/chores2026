/**
 * SKU Mapping Update API
 * POST /api/admin/sku-mappings/update
 * Staff-only: Update an existing SKU mapping
 * ~70 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { updateSKUMapping } from "../../../../lib/services/sku-mapping-service.ts";

interface UpdateSKURequest {
  id: string;
  sku?: string;
  plan_type?: string;
  duration_months?: number;
  product_name?: string;
  price_cents?: number;
  description?: string;
  is_active?: boolean;
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
    let body: UpdateSKURequest;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: "Missing required field: id" }, { status: 400 });
    }

    // Validate duration if provided
    if (updates.duration_months !== undefined && (updates.duration_months < 1 || updates.duration_months > 24)) {
      return Response.json({ error: "duration_months must be between 1 and 24" }, { status: 400 });
    }

    // Normalize SKU if provided
    if (updates.sku) {
      updates.sku = updates.sku.trim().toUpperCase();
    }

    // 4. Update the mapping
    try {
      const mapping = await updateSKUMapping(id, updates);

      console.log(`📦 SKU mapping updated by ${session.user.email}: ${mapping.sku}`);

      return Response.json({
        success: true,
        mapping,
      });
    } catch (error) {
      console.error("Error updating SKU mapping:", error);
      return Response.json({ error: "Failed to update mapping" }, { status: 500 });
    }
  },
};
