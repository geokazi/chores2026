# Gift Code Testing Guide

**Created**: February 6, 2026
**Status**: Ready for QA
**Coverage**: Full gift code lifecycle

---

## Overview

This guide covers testing for the complete gift code flow:
1. Admin batch code generation
2. Buy as Gift on pricing page
3. Email delivery via Resend
4. Code redemption
5. Plan activation

---

## Prerequisites

### Test Environment
- Development server running (`deno task dev`)
- Supabase connection configured
- Resend API key set (`RESEND_API_KEY` in `.env`)

### Test Accounts
- Staff account: email ending in `@choregami.com`, `@choregami.app`, or `@probuild365.com`
- Regular user account: any non-staff email
- Fresh account for redemption testing (no existing subscription)

---

## Test Suite 1: Admin Panel Access Control

### T1.1: Staff Access Granted
**Steps:**
1. Log in with staff email (e.g., `admin@choregami.com`)
2. Navigate to `/admin/gift-codes`

**Expected:**
- Admin panel loads successfully
- Shows "Gift Code Administration" header
- Generate, View, and Stats tabs visible

### T1.2: Non-Staff Access Denied
**Steps:**
1. Log in with regular user email
2. Navigate to `/admin/gift-codes`

**Expected:**
- 403 error page displayed
- Message: "Staff access required"
- Shows authorized domains list

### T1.3: Unauthenticated Access Denied
**Steps:**
1. Log out
2. Navigate to `/admin/gift-codes`

**Expected:**
- Redirect to login page OR
- 401 error displayed

---

## Test Suite 2: Batch Code Generation

### T2.1: Generate Single Code
**Steps:**
1. Login as staff, go to `/admin/gift-codes`
2. Select "Generate Codes" tab
3. Choose plan type: "Summer Plan"
4. Set quantity: 1
5. Click "Generate"

**Expected:**
- Success message displayed
- 1 code shown in format `CHORE-XXXX-XXXX`
- Code appears in "View Codes" tab as pending

### T2.2: Generate Batch Codes
**Steps:**
1. Generate tab
2. Plan type: "Full Year Plan"
3. Quantity: 10
4. Click "Generate"

**Expected:**
- 10 codes generated
- All codes listed with copy functionality
- Total in Stats tab increases by 10

### T2.3: Generate with Custom Note
**Steps:**
1. Generate tab
2. Plan type: "Half Year Plan"
3. Quantity: 5
4. Note: "Holiday promo batch"
5. Generate

**Expected:**
- 5 codes created
- Note stored in `message` field
- Visible when viewing code details

### T2.4: Invalid Quantity Rejected
**Steps:**
1. Try to generate with quantity: 0
2. Try to generate with quantity: -5
3. Try to generate with quantity: 1000

**Expected:**
- Quantity 0: Error "Invalid quantity"
- Quantity -5: Error "Invalid quantity"
- Quantity 1000: Error "Maximum 100 codes per batch"

---

## Test Suite 3: View & Filter Codes

### T3.1: View All Codes
**Steps:**
1. Go to "View Codes" tab
2. Ensure filter set to "All"

**Expected:**
- All codes displayed (pending + redeemed)
- Columns: Code, Plan, Created, Status, Redeemed By, Expires

### T3.2: Filter Pending Codes
**Steps:**
1. Set status filter to "Pending"

**Expected:**
- Only unredeemed codes shown
- "Redeemed By" column empty for all

### T3.3: Filter Redeemed Codes
**Steps:**
1. Set status filter to "Redeemed"

**Expected:**
- Only redeemed codes shown
- Each shows redeemer email and expiry date

### T3.4: Filter by Plan Type
**Steps:**
1. Select "Full Year Plan" from plan filter

**Expected:**
- Only full_year codes displayed
- Filter persists across pagination

### T3.5: Pagination
**Steps:**
1. Generate 150+ codes
2. Navigate through pages

**Expected:**
- 100 codes per page (default)
- Next/Previous buttons work
- Count shows correct totals

---

## Test Suite 4: Statistics Dashboard

### T4.1: View Overall Stats
**Steps:**
1. Go to "Stats" tab

**Expected:**
- Total codes generated count
- Pending codes count
- Redeemed codes count
- Revenue metrics by plan type

### T4.2: Stats Accuracy
**Steps:**
1. Note current pending count
2. Generate 5 new codes
3. Refresh stats

**Expected:**
- Pending count increased by 5
- Total increased by 5
- Redeemed count unchanged

### T4.3: Revenue Calculation
**Steps:**
1. View stats for each plan type
2. Verify: Summer=$29.99, HalfYear=$49.99, FullYear=$79.99

**Expected:**
- Pending revenue = count × price
- Redeemed revenue = count × price
- Total revenue = sum of all

---

## Test Suite 5: Buy as Gift (Pricing Page)

### T5.1: Toggle Gift Mode
**Steps:**
1. Go to pricing page (logged in)
2. Click "Buy as Gift" toggle on any plan card

**Expected:**
- Card switches to gift mode
- "Subscribe" button hidden
- Gift form fields appear
- "Purchase Gift" button shown

### T5.2: Gift Form Validation
**Steps:**
1. Enable gift mode
2. Leave email empty, click Purchase

**Expected:**
- Error: "Please enter recipient email"

**Steps continued:**
3. Enter invalid email "notanemail"
4. Click Purchase

**Expected:**
- Error: "Please enter a valid email"

### T5.3: Successful Gift Purchase (Email Sent)
**Steps:**
1. Enable gift mode
2. Fill form:
   - Recipient email: valid@test.com
   - Recipient name: "Test Person"
   - Your name: "Gift Giver"
   - Message: "Enjoy your gift!"
3. Click "Purchase Gift"

**Expected:**
- Loading spinner shown
- Success card displays with:
  - Generated code visible
  - "Copy Code" button
  - Message about email sent
  - Link to redeem page

**Verify:**
- Check Resend dashboard for sent email
- Email contains correct code, sender name, message
- Redeem link points to correct URL

### T5.4: Gift Purchase (Copy Code Only)
**Steps:**
1. Enable gift mode
2. Fill form with email
3. Uncheck "Send via email" (if option exists)
4. Or: After purchase, use code directly

**Expected:**
- Code displayed prominently
- User can copy to clipboard
- Code works when redeemed

### T5.5: Gift for Different Plan Types
**Steps:**
1. Purchase gift for Summer Plan
2. Purchase gift for Half Year Plan
3. Purchase gift for Full Year Plan

**Expected:**
- Each generates valid code
- Plan duration correct in response
- Email (if sent) shows correct plan details

---

## Test Suite 6: Email Delivery

### T6.1: Email Content Verification
**Steps:**
1. Purchase gift with email delivery
2. Check recipient inbox (or Resend dashboard)

**Expected Email Contains:**
- Subject: "🎁 [SenderName] sent you a ChoreGami gift!"
- Greeting with recipient name (if provided)
- Sender's personal message (if provided)
- Gift code prominently displayed
- Plan name and duration
- "Redeem Your Gift" button
- Link to choregami.app/redeem?code=XXX
- What's included list
- ChoreGami branding

### T6.2: Email Without Personal Message
**Steps:**
1. Purchase gift without filling message field

**Expected:**
- Email sent successfully
- Personal message section not shown
- Rest of email intact

### T6.3: Email Delivery Failure Handling
**Steps:**
1. Purchase gift to invalid domain (test-nonexistent@invaliddomain.fake)

**Expected:**
- Gift code still generated
- Response includes `emailSent: false`
- Error message provided
- User can still copy code manually

### T6.4: Resend Rate Limiting
**Steps:**
1. Send 5+ gift emails rapidly

**Expected:**
- Some may be rate limited
- Codes still generated
- User informed if email failed

---

## Test Suite 7: Code Redemption

### T7.1: Valid Code Redemption
**Steps:**
1. Log in as user without subscription
2. Go to `/redeem`
3. Enter valid pending gift code
4. Submit

**Expected:**
- Success message
- Plan activated immediately
- Redirect to dashboard
- Plan visible in settings

### T7.2: Already Redeemed Code
**Steps:**
1. Use a code that was already redeemed

**Expected:**
- Error: "This code has already been redeemed"
- No plan changes

### T7.3: Invalid Code Format
**Steps:**
1. Enter "INVALID-CODE"
2. Enter random characters

**Expected:**
- Error: "Invalid gift code"

### T7.4: Redemption While Subscribed
**Steps:**
1. Log in as user WITH active subscription
2. Try to redeem gift code

**Expected:**
- Warning about existing subscription
- Option to extend/replace (based on implementation)
- Clear communication about what happens

### T7.5: URL Parameter Redemption
**Steps:**
1. Navigate to `/redeem?code=CHORE-XXXX-XXXX`

**Expected:**
- Code auto-filled in form
- Or: Auto-validation attempted
- User sees result immediately

---

## Test Suite 8: Plan Activation

### T8.1: Correct Plan Duration
**Steps:**
1. Redeem Summer Plan code
2. Check family settings

**Expected:**
- Plan shows as "summer"
- Expiry = redemption date + 3 months

### T8.2: Plan Features Active
**Steps:**
1. After redemption, access premium features
2. Try: creating events, viewing reports, etc.

**Expected:**
- All premium features accessible
- No upgrade prompts
- Plan indicator shows active status

### T8.3: Expiry Behavior
**Steps:**
1. (Requires time travel or test code)
2. Set plan to expire

**Expected:**
- Features locked after expiry
- Upgrade prompt shown
- Data preserved

---

## Test Suite 9: Edge Cases

### T9.1: Concurrent Redemptions
**Steps:**
1. Open two browsers with same code
2. Click redeem simultaneously

**Expected:**
- Only one succeeds
- Other gets "already redeemed"
- No double-activation

### T9.2: Admin Code vs User Code
**Steps:**
1. Admin generates codes
2. User buys gift code
3. Compare in database

**Expected:**
- Both in gift_codes table
- Different purchased_by values
- Both redeemable

### T9.3: Long Personal Message
**Steps:**
1. Enter 1000+ character message

**Expected:**
- Either truncated or rejected
- Email still formatted correctly
- No layout breaking

### T9.4: Special Characters in Names
**Steps:**
1. Use names with: éàü, 中文, emoji 👨‍👩‍👧

**Expected:**
- Stored correctly
- Displayed correctly in email
- No encoding issues

---

## Test Suite 10: Security

### T10.1: Code Brute Force Protection
**Steps:**
1. Try 100 invalid codes rapidly

**Expected:**
- Rate limiting kicks in
- Temporary block or CAPTCHA
- Logged as suspicious activity

### T10.2: API Authentication
**Steps:**
1. Call `/api/gift/purchase` without auth

**Expected:**
- 401 Unauthorized

### T10.3: Admin API Without Staff Role
**Steps:**
1. Call `/api/admin/gift-codes/generate` as regular user

**Expected:**
- 403 Forbidden

### T10.4: Code Enumeration Prevention
**Steps:**
1. Try sequential codes (CHORE-0001-0001, etc.)

**Expected:**
- Codes are random, not sequential
- Cannot guess valid codes

---

## Test Suite 11: Shopify Webhook

### T11.1: Valid Webhook Signature
**Steps:**
1. Generate valid HMAC signature using `SHOPIFY_WEBHOOK_SECRET`
2. Send POST to `/api/webhooks/shopify/order-paid` with signature header

**Expected:**
- Request accepted (not 401)
- Processing continues

### T11.2: Invalid Webhook Signature
**Steps:**
1. Send POST with incorrect or missing `X-Shopify-Hmac-Sha256` header

**Expected:**
- 401 Unauthorized response
- "Invalid Shopify webhook signature" logged

### T11.3: SKU Mapping (Primary)
**Steps:**
1. Send webhook with `line_items[0].sku = "CG-3M-PASS"`
2. Send webhook with `line_items[0].sku = "CG-6M-PASS"`
3. Send webhook with `line_items[0].sku = "CG-12M-PASS"`

**Expected:**
- CG-3M-PASS → summer (3 months)
- CG-6M-PASS → school_year (6 months)
- CG-12M-PASS → full_year (12 months)

### T11.4: Title Mapping (Fallback)
**Steps:**
1. Send webhook with `line_items[0].title = "ChoreGami Summer Pass"` (no SKU)
2. Send webhook with `line_items[0].title = "ChoreGami Family Pass"` (no SKU)

**Expected:**
- Title matching works as fallback when SKU missing
- Correct plan type assigned

### T11.5: Unknown Product Handling
**Steps:**
1. Send webhook with unrecognized product title/SKU

**Expected:**
- 400 Bad Request
- "Could not determine plan type" logged
- No code generated

### T11.6: Email Delivery on Order
**Steps:**
1. Send valid webhook with customer email
2. Check Resend dashboard

**Expected:**
- Gift code email sent to customer
- Email contains order-specific message
- Code is valid and redeemable

### T11.7: Missing Customer Email
**Steps:**
1. Send webhook without `email` or `customer.email` field

**Expected:**
- 400 Bad Request
- "No customer email" error

### T11.8: Email Failure Non-Blocking
**Steps:**
1. Send webhook with invalid email domain

**Expected:**
- 200 OK returned to Shopify
- Gift code still generated
- `emailSent: false` in response
- Error logged for manual follow-up

### T11.9: End-to-End Shopify Test
**Steps:**
1. Create test order in Shopify (or use test mode)
2. Complete payment
3. Wait for webhook delivery

**Expected:**
- Webhook received within seconds
- Gift code generated
- Email sent to customer
- Code redeemable at `/redeem`

### Manual Webhook Testing
```bash
# Generate test HMAC
SECRET="810e113afb6679f377fd7f63f7d6beb2fca71b16efac80213d9be40507fe737c"
BODY='{"id":123,"order_number":1001,"email":"test@example.com","customer":{"first_name":"Test"},"line_items":[{"title":"ChoreGami Summer Pass","sku":"CG-3M-PASS"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send test webhook (local)
curl -X POST http://localhost:8000/api/webhooks/shopify/order-paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"

# Send test webhook (production)
curl -X POST https://choregami.app/api/webhooks/shopify/order-paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"
```

### T11.10: Idempotency Check
**Steps:**
1. Send valid webhook for order ID 123
2. Send same webhook again (same order ID)

**Expected:**
- First request: New gift code generated
- Second request: Returns cached code, `duplicate: true` in response
- Only one record in `shopify_orders` table

---

## Smoke Test Checklist

Quick verification for deployments:

- [ ] Admin panel loads for staff
- [ ] Admin panel blocked for non-staff
- [ ] Can generate 1 code
- [ ] Code appears in list
- [ ] Buy as Gift toggle works
- [ ] Can purchase gift (code displayed)
- [ ] Email received (check Resend)
- [ ] Code redeemable
- [ ] Plan activates correctly
- [ ] Shopify webhook responds to valid signature
- [ ] Shopify webhook rejects invalid signature

---

## Troubleshooting

### Gift Code Not Generating
1. Check `SUPABASE_SERVICE_ROLE_KEY` is set
2. Verify `create_gift_code` function exists in database
3. Check server logs for RPC errors

### Email Not Sending
1. Verify `RESEND_API_KEY` is valid
2. Check Resend dashboard for errors
3. Verify sender domain is verified in Resend

### Redemption Failing
1. Check code exists in `gift_codes` table
2. Verify `redeemed_by` is null (not already used)
3. Check user has valid session

### Stats Not Updating
1. Hard refresh the page
2. Check database query in stats.ts
3. Verify RLS isn't blocking service role

---

## Automated Test Recommendations

Future: Create Deno tests for:
```typescript
// tests/gift-code-api.test.ts
Deno.test("POST /api/gift/purchase requires auth", ...);
Deno.test("POST /api/gift/purchase validates plan type", ...);
Deno.test("POST /api/gift/purchase generates valid code", ...);
Deno.test("GET /api/admin/gift-codes/list requires staff", ...);

// tests/shopify-webhook.test.ts
Deno.test("POST /api/webhooks/shopify/order-paid rejects invalid HMAC", ...);
Deno.test("POST /api/webhooks/shopify/order-paid maps product to plan", ...);
Deno.test("POST /api/webhooks/shopify/order-paid generates code", ...);
Deno.test("POST /api/webhooks/shopify/order-paid sends email", ...);
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-06 | 1.0 | Initial testing guide |
