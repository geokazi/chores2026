# Shopify Webhook Gift Code Fulfillment

**Date**: February 7, 2026
**Status**: Implemented
**Category**: E-commerce / Gift Codes

---

## Overview

Automatic gift code generation and email delivery when customers purchase ChoreGami plans through Shopify. This enables selling gift codes on Shopify with zero manual fulfillment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SHOPIFY ORDER FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Customer purchases "Summer Plan" on Shopify                             │
│                                                                             │
│  2. Shopify sends webhook to:                                               │
│     POST https://choregami.app/api/webhooks/shopify/order-paid              │
│     Headers: X-Shopify-Hmac-Sha256: <signature>                             │
│     Body: { order JSON with line_items, customer email, etc. }              │
│                                                                             │
│  3. Webhook handler:                                                        │
│     a. Verifies HMAC signature using SHOPIFY_WEBHOOK_SECRET                 │
│     b. Extracts customer email from order                                   │
│     c. Maps product title/SKU to plan type                                  │
│     d. Calls create_gift_code RPC (service client)                          │
│     e. Sends email via Resend with gift code                                │
│     f. Returns 200 to Shopify                                               │
│                                                                             │
│  4. Customer receives email with:                                           │
│     - Gift code (CHORE-XXXX-XXXX format)                                    │
│     - Redeem link (choregami.app/redeem?code=XXX)                           │
│     - Plan details and duration                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `routes/api/webhooks/shopify/order-paid.ts` | Webhook handler (~150 lines) |
| `sql/20260207_shopify_orders.sql` | Idempotency table migration |
| `sql/20260207_shopify_sku_mappings.sql` | SKU-to-plan mapping table migration |
| `lib/services/sku-mapping-service.ts` | Cached SKU lookup service (~170 lines) |
| `routes/admin/shopify-skus.tsx` | Admin UI page |
| `islands/ShopifySKUAdmin.tsx` | Admin UI component (~300 lines) |
| `routes/api/admin/sku-mappings/list.ts` | List SKU mappings API |
| `routes/api/admin/sku-mappings/add.ts` | Add SKU mapping API |
| `routes/api/admin/sku-mappings/update.ts` | Update SKU mapping API |
| `routes/api/admin/sku-mappings/delete.ts` | Delete SKU mapping API |

---

## Idempotency Table

Prevents duplicate gift code generation when Shopify retries webhooks:

```sql
CREATE TABLE shopify_orders (
  shopify_order_id BIGINT PRIMARY KEY,  -- O(1) duplicate check
  customer_email TEXT NOT NULL,
  gift_code TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Flow:** On webhook receipt, check if `shopify_order_id` exists. If yes, return cached `gift_code`. If no, generate new code and record.

---

## Product to Plan Mapping

The handler maps Shopify products to ChoreGami plans via SKU (primary) or title (fallback):

| Product | SKU | Plan Type | Duration | Price |
|---------|-----|-----------|----------|-------|
| ChoreGami Monthly Trial | `CG-1M-TRIAL` | `trial` | 1 month | $4.99 |
| ChoreGami Summer Pass (3 Months) | `CG-3M-PASS` | `summer` | 3 months | $14.99 |
| ChoreGami School Year Pass (6 Months) | `CG-6M-PASS` | `school_year` | 6 months | $24.99 |
| ChoreGami Full Year Pass (12 Months) | `CG-12M-PASS` | `full_year` | 12 months | $39.99 |

SKU matching is O(1) lookup via in-memory cache. Title matching is case-insensitive fallback.

**Admin-Configurable:** SKU mappings are stored in the database (`shopify_sku_mappings` table) and can be managed via `/admin/shopify-skus` without code deployment. Add new products (e.g., "Family Reset Challenge" bundle) instantly.

> **Pricing Strategy (Feb 2026)**: Competitive rates based on market research. Goal: Remove price objection, maximize acquisition before raising prices.

---

## Security

### HMAC Signature Verification

All webhooks are verified using SHA-256 HMAC:

```typescript
async function verifyShopifyWebhook(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
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
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SHOPIFY_WEBHOOK_SECRET` | HMAC signing secret from Shopify webhook settings |

---

## Shopify Configuration

### Webhook Setup

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Click "Create webhook"
3. Configure:
   - **Event**: Order payment
   - **Format**: JSON
   - **URL**: `https://choregami.app/api/webhooks/shopify/order-paid`
   - **API version**: `2024-01` (or latest stable)
4. Save the webhook signing secret to Fly.io:
   ```bash
   fly secrets set SHOPIFY_WEBHOOK_SECRET="your_secret_here"
   ```

### Product Setup

Create products in Shopify with:
- Title containing "Summer", "Half Year", or "Full Year"
- OR SKU set to `CHORE-SUMMER`, `CHORE-HALF`, or `CHORE-FULL`
- Price matching your plan pricing ($4.99, $14.99, $24.99, $39.99)

---

## Error Handling

| Scenario | Response | Action |
|----------|----------|--------|
| Invalid HMAC | 401 Unauthorized | Reject request |
| No customer email | 400 Bad Request | Log error |
| Unknown product | 400 Bad Request | Log for manual review |
| Code generation fails | 500 Internal Error | Shopify will retry |
| Email fails | 200 OK | Code still generated, logged for follow-up |

Email failures are non-blocking - the gift code is still generated and can be retrieved from admin panel.

---

## Testing

See [Gift Code Testing Guide](../testing/20260206_gift_code_testing_guide.md#test-suite-11-shopify-webhook) for:
- HMAC verification tests
- Product mapping tests
- End-to-end order simulation

### Manual Testing with curl

```bash
# Generate test HMAC (replace secret)
SECRET="your_webhook_secret"
BODY='{"id":123,"email":"test@example.com","line_items":[{"title":"Summer Plan","sku":"CHORE-SUMMER"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send test webhook
curl -X POST https://choregami.app/api/webhooks/shopify/order-paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"
```

---

## Related Documentation

- [Template Gating & Gift Codes](./20260118_template_gating_gift_codes.md) - Gift code system overview
- [Gift Code Auth Flow Preservation](./20260207_gift_code_auth_flow_preservation.md) - Redemption flow through auth
- [Gift Code Testing Guide](../testing/20260206_gift_code_testing_guide.md) - Comprehensive test cases
- [Business Requirements](../business-requirements.md) - Monetization strategy
- [Amazon/Shopify Distribution Strategy](../marketing/20260206_amazon_whatsapp_distribution_strategy.md) - Sales channel strategy

---

## Testing

A test script is available at `scripts/test-shopify-webhook.sh`:

```bash
# Test all SKUs locally
./scripts/test-shopify-webhook.sh "your_webhook_secret" "your@email.com"
```

Tests included:
- All 4 SKUs (CG-1M-TRIAL, CG-3M-PASS, CG-6M-PASS, CG-12M-PASS)
- Idempotency (same order ID returns cached code)
- Invalid HMAC signature (401)
- Unknown SKU (400)

---

## Database Migrations Required

Run these in order in Supabase SQL Editor:

1. `sql/20260118_gift_codes.sql` - Gift codes table and RPC
2. `sql/20260207_shopify_orders.sql` - Idempotency table
3. `sql/20260207_shopify_sku_mappings.sql` - SKU mappings with pricing
4. `sql/20260208_gift_codes_shopify_fix.sql` - Make purchased_by nullable for Shopify

---

## Future Enhancements

- **Order metadata**: Store Shopify order ID in gift_codes table for reconciliation
- **Quantity support**: Handle orders with multiple gift code quantities
- **Variant-based mapping**: Support Shopify variants for different plan durations

---

**Author**: Development Team
**Created**: February 7, 2026
**Updated**: February 8, 2026 (Database fix for nullable purchased_by, full end-to-end testing verified)
