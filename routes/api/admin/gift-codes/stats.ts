/**
 * Gift Code Statistics API
 * GET /api/admin/gift-codes/stats
 * Staff-only: Financial and usage statistics
 * ~120 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";

// Plan prices for revenue calculation
const PLAN_PRICES: Record<string, number> = {
  summer: 29.99,
  school_year: 49.99,
  full_year: 79.99,
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  summer: "Summer (3mo)",
  school_year: "Half Year (6mo)",
  full_year: "Full Year (12mo)",
};

interface GiftCodeRecord {
  code: string;
  plan_type: string;
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

    const supabase = getServiceSupabaseClient();

    // 3. Get all codes for statistics
    const { data: allCodes, error } = await supabase
      .from("gift_codes")
      .select("code, plan_type, purchased_at, redeemed_by, redeemed_at");

    if (error) {
      console.error("Error fetching gift codes for stats:", error);
      return Response.json({ error: "Failed to fetch statistics" }, { status: 500 });
    }

    // 4. Calculate statistics
    const codes: GiftCodeRecord[] = allCodes || [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Overall counts
    const totalGenerated = codes.length;
    const totalRedeemed = codes.filter((c) => c.redeemed_by !== null).length;
    const totalPending = totalGenerated - totalRedeemed;

    // By plan type
    const byPlanType: Record<string, { generated: number; redeemed: number; pending: number; revenue: number }> = {};
    for (const planType of Object.keys(PLAN_PRICES)) {
      const planCodes = codes.filter((c) => c.plan_type === planType);
      const redeemed = planCodes.filter((c) => c.redeemed_by !== null).length;
      byPlanType[planType] = {
        generated: planCodes.length,
        redeemed,
        pending: planCodes.length - redeemed,
        revenue: redeemed * PLAN_PRICES[planType],
      };
    }

    // Time-based stats
    const redeemedLast30Days = codes.filter(
      (c) => c.redeemed_at && new Date(c.redeemed_at) >= thirtyDaysAgo
    ).length;
    const redeemedLast7Days = codes.filter(
      (c) => c.redeemed_at && new Date(c.redeemed_at) >= sevenDaysAgo
    ).length;
    const generatedLast30Days = codes.filter(
      (c) => new Date(c.purchased_at) >= thirtyDaysAgo
    ).length;

    // Calculate total revenue
    const totalRevenue = codes
      .filter((c) => c.redeemed_by !== null)
      .reduce((sum, c) => sum + (PLAN_PRICES[c.plan_type] || 0), 0);

    const revenueLast30Days = codes
      .filter((c) => c.redeemed_at && new Date(c.redeemed_at) >= thirtyDaysAgo)
      .reduce((sum, c) => sum + (PLAN_PRICES[c.plan_type] || 0), 0);

    // Conversion rate
    const conversionRate = totalGenerated > 0
      ? Math.round((totalRedeemed / totalGenerated) * 100)
      : 0;

    return Response.json({
      overview: {
        total_generated: totalGenerated,
        total_redeemed: totalRedeemed,
        total_pending: totalPending,
        conversion_rate: conversionRate,
      },
      revenue: {
        total: totalRevenue,
        last_30_days: revenueLast30Days,
        formatted_total: `$${totalRevenue.toFixed(2)}`,
        formatted_30d: `$${revenueLast30Days.toFixed(2)}`,
      },
      by_plan_type: Object.entries(byPlanType).map(([type, stats]) => ({
        plan_type: type,
        display_name: PLAN_DISPLAY_NAMES[type],
        price: PLAN_PRICES[type],
        ...stats,
        formatted_revenue: `$${stats.revenue.toFixed(2)}`,
      })),
      activity: {
        redeemed_last_7_days: redeemedLast7Days,
        redeemed_last_30_days: redeemedLast30Days,
        generated_last_30_days: generatedLast30Days,
      },
      last_updated: new Date().toISOString(),
    });
  },
};
