/**
 * Shopify Order Paid Webhook Handler
 * POST /api/webhooks/shopify/order-paid
 * Generates gift code and emails customer on successful order
 *
 * Flow: Verify HMAC → Check idempotency → Lookup SKU → Generate code → Email → Record
 * SKU mappings are loaded from database and cached in memory
 * ~150 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";
import { sendGiftCodeEmail } from "../../../../lib/services/email-service.ts";
import { getSKUMapping, getDurationForSKU } from "../../../../lib/services/sku-mapping-service.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Fallback title patterns (for products without SKU configured)
const TITLE_FALLBACKS: Record<string, { plan_type: string; duration_months: number }> = {
  "summer": { plan_type: "summer", duration_months: 3 },
  "3 month": { plan_type: "summer", duration_months: 3 },
  "family pass": { plan_type: "school_year", duration_months: 6 },
  "6 month": { plan_type: "school_year", duration_months: 6 },
  "full year": { plan_type: "full_year", duration_months: 12 },
  "12 month": { plan_type: "full_year", duration_months: 12 },
  "1 month": { plan_type: "trial", duration_months: 1 },
  "30 day": { plan_type: "trial", duration_months: 1 },
  "reset": { plan_type: "trial", duration_months: 1 },
};

async function verifyShopifyWebhook(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET not configured");
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return computedHmac === hmacHeader;
}

interface PlanInfo {
  plan_type: string;
  duration_months: number;
}

async function determinePlanInfo(lineItems: Array<{ title: string; sku?: string }>): Promise<PlanInfo | null> {
  for (const item of lineItems) {
    // Check SKU first (database lookup with cache)
    if (item.sku) {
      const mapping = await getSKUMapping(item.sku);
      if (mapping) {
        return {
          plan_type: mapping.plan_type,
          duration_months: mapping.duration_months,
        };
      }
    }

    // Fallback: Check title patterns (for unconfigured products)
    const titleLower = item.title.toLowerCase();
    for (const [key, info] of Object.entries(TITLE_FALLBACKS)) {
      if (titleLower.includes(key)) {
        return info;
      }
    }
  }
  return null;
}

function formatDuration(months: number): string {
  if (months === 1) return "1 month";
  if (months === 12) return "1 year";
  return `${months} months`;
}

export const handler: Handlers = {
  async POST(req) {
    const body = await req.text();
    const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256") || "";

    // 1. Verify webhook signature
    const isValid = await verifyShopifyWebhook(body, hmacHeader);
    if (!isValid) {
      console.error("Invalid Shopify webhook signature");
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse order data
    const order = JSON.parse(body);
    const orderId = order.id;
    const customerEmail = order.email || order.customer?.email;
    const customerName = order.customer?.first_name || order.billing_address?.first_name;

    if (!customerEmail) {
      console.error("No customer email in order:", orderId);
      return new Response("No customer email", { status: 400 });
    }

    const supabase = getServiceSupabaseClient();

    // 3. Idempotency check - prevent duplicate codes on webhook retry
    const { data: existingOrder } = await supabase
      .from("shopify_orders")
      .select("gift_code")
      .eq("shopify_order_id", orderId)
      .single();

    if (existingOrder) {
      console.log(`⏭️ Order ${orderId} already processed, code: ${existingOrder.gift_code}`);
      return new Response(JSON.stringify({
        success: true,
        code: existingOrder.gift_code,
        emailSent: true, // Already sent
        duplicate: true,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Determine plan type from line items (database lookup with cache)
    const planInfo = await determinePlanInfo(order.line_items || []);
    if (!planInfo) {
      console.error("Could not determine plan type from order:", orderId, order.line_items);
      return new Response("Unknown product - SKU not configured", { status: 400 });
    }

    console.log(`🛒 Shopify order ${orderId}: ${planInfo.plan_type} (${planInfo.duration_months}mo) for ${customerEmail}`);

    // 5. Generate gift code
    const { data: giftCode, error: genError } = await supabase.rpc("create_gift_code", {
      p_plan_type: planInfo.plan_type,
      p_purchased_by: null, // Shopify purchase, no user ID
      p_message: `Shopify Order #${order.order_number || orderId}`,
    });

    if (genError || !giftCode) {
      console.error("Gift code generation failed:", genError);
      return new Response("Code generation failed", { status: 500 });
    }

    console.log(`🎁 Generated code ${giftCode} for Shopify order ${orderId}`);

    // 6. Record fulfillment for idempotency
    await supabase.from("shopify_orders").insert({
      shopify_order_id: orderId,
      customer_email: customerEmail,
      gift_code: giftCode,
      plan_type: planInfo.plan_type,
    });

    // 7. Send email to customer
    const emailResult = await sendGiftCodeEmail({
      recipientEmail: customerEmail,
      recipientName: customerName,
      senderName: "ChoreGami",
      giftCode,
      planType: planInfo.plan_type,
      planDuration: formatDuration(planInfo.duration_months),
      personalMessage: "Thank you for your purchase! Here's your ChoreGami gift code.",
    });

    if (!emailResult.success) {
      console.error(`Failed to send email to ${customerEmail}:`, emailResult.error);
      // Don't fail the webhook - code is generated, log for manual follow-up
    } else {
      console.log(`✅ Email sent to ${customerEmail} for order ${orderId}`);
    }

    // 8. Return success (Shopify expects 200)
    return new Response(JSON.stringify({
      success: true,
      code: giftCode,
      emailSent: emailResult.success
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
