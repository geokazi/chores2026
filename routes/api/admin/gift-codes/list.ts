/**
 * Gift Code List API
 * GET /api/admin/gift-codes/list
 * Staff-only: List gift codes with filtering
 * ~100 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";

interface GiftCodeRecord {
  code: string;
  plan_type: string;
  message: string | null;
  purchased_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

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

    // 3. Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all"; // all, pending, redeemed
    const planType = url.searchParams.get("plan_type"); // optional filter
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Build query
    const supabase = getServiceSupabaseClient();
    let query = supabase
      .from("gift_codes")
      .select("code, plan_type, message, purchased_at, redeemed_by, redeemed_at")
      .order("purchased_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status === "pending") {
      query = query.is("redeemed_by", null);
    } else if (status === "redeemed") {
      query = query.not("redeemed_by", "is", null);
    }

    // Apply plan type filter
    if (planType && ["summer", "school_year", "full_year"].includes(planType)) {
      query = query.eq("plan_type", planType);
    }

    // 5. Execute query
    const { data: codes, error, count } = await query;

    if (error) {
      console.error("Error fetching gift codes:", error);
      return Response.json({ error: "Failed to fetch codes" }, { status: 500 });
    }

    // 6. Get total counts for each status
    const [pendingResult, redeemedResult] = await Promise.all([
      supabase
        .from("gift_codes")
        .select("code", { count: "exact", head: true })
        .is("redeemed_by", null),
      supabase
        .from("gift_codes")
        .select("code", { count: "exact", head: true })
        .not("redeemed_by", "is", null),
    ]);

    return Response.json({
      codes: codes || [],
      pagination: {
        limit,
        offset,
        total: (pendingResult.count || 0) + (redeemedResult.count || 0),
      },
      summary: {
        pending: pendingResult.count || 0,
        redeemed: redeemedResult.count || 0,
      },
      filters: {
        status,
        plan_type: planType,
      },
    });
  },
};
