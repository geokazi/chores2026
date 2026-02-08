/**
 * SKU Mapping Add API
 * POST /api/admin/sku-mappings/add
 * Staff-only: Add a new Shopify SKU to plan mapping
 * ~70 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { addSKUMapping } from "../../../../lib/services/sku-mapping-service.ts";

interface AddSKURequest {
  sku: string;
  plan_type: string;
  duration_months: number;
  product_name: string;
  price_cents?: number;
  description?: string;
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
    let body: AddSKURequest;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { sku, plan_type, duration_months, product_name, price_cents, description } = body;

    // Validate required fields
    if (!sku || !plan_type || !duration_months || !product_name) {
      return Response.json({
        error: "Missing required fields",
        required: ["sku", "plan_type", "duration_months", "product_name"],
      }, { status: 400 });
    }

    // Validate duration
    if (duration_months < 1 || duration_months > 24) {
      return Response.json({ error: "duration_months must be between 1 and 24" }, { status: 400 });
    }

    // 4. Add the mapping
    try {
      const mapping = await addSKUMapping({
        sku: sku.trim().toUpperCase(),
        plan_type,
        duration_months,
        product_name: product_name.trim(),
        price_cents,
        description,
      });

      console.log(`📦 SKU mapping added by ${session.user.email}: ${sku} → ${plan_type}`);

      return Response.json({
        success: true,
        mapping,
      });
    } catch (error) {
      // Check for duplicate SKU
      if (String(error).includes("duplicate") || String(error).includes("unique")) {
        return Response.json({ error: `SKU "${sku}" already exists` }, { status: 409 });
      }
      console.error("Error adding SKU mapping:", error);
      return Response.json({ error: "Failed to add mapping" }, { status: 500 });
    }
  },
};
