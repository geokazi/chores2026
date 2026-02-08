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
| `routes/api/webhooks/shopify/order-paid.ts` | Webhook handler (~130 lines) |

---

## Product to Plan Mapping

The handler maps Shopify products to ChoreGami plans via title or SKU:

| Product Title | SKU | Plan Type | Duration |
|--------------|-----|-----------|----------|
| "Summer Plan" | `CHORE-SUMMER` | `summer` | 3 months |
| "Half Year Plan" | `CHORE-HALF` | `school_year` | 6 months |
| "Full Year Plan" | `CHORE-FULL` | `full_year` | 12 months |

Matching is case-insensitive for titles. SKU takes priority if present.

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
- Price matching your plan pricing ($29.99, $49.99, $79.99)

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

## Future Enhancements

- **Order metadata**: Store Shopify order ID in gift_codes table for reconciliation
- **Quantity support**: Handle orders with multiple gift code quantities
- **Variant-based mapping**: Support Shopify variants for different plan durations
- **Retry webhook**: Implement idempotency key to prevent duplicate codes on retry

---

**Author**: Development Team
**Created**: February 7, 2026
