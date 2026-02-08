/**
 * Shopify Order Paid Webhook Handler
 * POST /api/webhooks/shopify/order-paid
 * Generates gift code and emails customer on successful order
 *
 * Flow: Verify HMAC → Check idempotency → Generate code → Email → Record
 * ~130 lines
 */

import { Handlers } from "$fresh/server.ts";
import { getServiceSupabaseClient } from "../../../../lib/supabase.ts";
import { sendGiftCodeEmail } from "../../../../lib/services/email-service.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Map Shopify SKUs to plan types (O(1) lookup)
const SKU_TO_PLAN: Record<string, string> = {
  "CG-3M-PASS": "summer",      // 3 months
  "CG-6M-PASS": "school_year", // 6 months
  "CG-12M-PASS": "full_year",  // 12 months
};

// Fallback: Match by product title (case-insensitive)
const TITLE_TO_PLAN: Record<string, string> = {
  "summer": "summer",
  "3 month": "summer",
  "family pass": "school_year",
  "6 month": "school_year",
  "full year": "full_year",
  "12 month": "full_year",
};

const PLAN_DURATIONS: Record<string, string> = {
  summer: "3 months",
  school_year: "6 months",
  full_year: "12 months",
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

function determinePlanType(lineItems: Array<{ title: string; sku?: string }>): string | null {
  for (const item of lineItems) {
    // Check SKU first (preferred, O(1))
    if (item.sku && SKU_TO_PLAN[item.sku]) {
      return SKU_TO_PLAN[item.sku];
    }
    // Fallback: Check title (case-insensitive)
    const titleLower = item.title.toLowerCase();
    for (const [key, plan] of Object.entries(TITLE_TO_PLAN)) {
      if (titleLower.includes(key)) {
        return plan;
      }
    }
  }
  return null;
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

    // 4. Determine plan type from line items
    const planType = determinePlanType(order.line_items || []);
    if (!planType) {
      console.error("Could not determine plan type from order:", orderId);
      return new Response("Unknown product", { status: 400 });
    }

    console.log(`🛒 Shopify order ${orderId}: ${planType} for ${customerEmail}`);

    // 5. Generate gift code
    const { data: giftCode, error: genError } = await supabase.rpc("create_gift_code", {
      p_plan_type: planType,
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
      plan_type: planType,
    });

    // 7. Send email to customer
    const emailResult = await sendGiftCodeEmail({
      recipientEmail: customerEmail,
      recipientName: customerName,
      senderName: "ChoreGami",
      giftCode,
      planType,
      planDuration: PLAN_DURATIONS[planType],
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
