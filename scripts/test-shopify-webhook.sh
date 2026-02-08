#!/bin/bash
# Test Shopify Webhook Locally
# Usage: ./scripts/test-shopify-webhook.sh [secret] [email]

set -e

# Configuration
SECRET="${1:-test_webhook_secret}"
EMAIL="${2:-test@example.com}"
BASE_URL="${3:-http://localhost:8000}"

echo "🧪 Testing Shopify Webhook"
echo "   Secret: ${SECRET:0:10}..."
echo "   Email: $EMAIL"
echo "   URL: $BASE_URL/api/webhooks/shopify/order-paid"
echo ""

# Test 1: CG-1M-TRIAL (Monthly $4.99)
echo "📦 Test 1: Monthly Trial (CG-1M-TRIAL)"
BODY='{"id":100001,"email":"'$EMAIL'","line_items":[{"title":"ChoreGami Monthly Trial","sku":"CG-1M-TRIAL","quantity":1,"price":"4.99"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY" | jq . 2>/dev/null || cat
echo -e "\n"

# Test 2: CG-3M-PASS (Summer $14.99)
echo "📦 Test 2: Summer Pass (CG-3M-PASS)"
BODY='{"id":100002,"email":"'$EMAIL'","line_items":[{"title":"ChoreGami Summer Pass","sku":"CG-3M-PASS","quantity":1,"price":"14.99"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY" | jq . 2>/dev/null || cat
echo -e "\n"

# Test 3: CG-6M-PASS (Half Year $24.99)
echo "📦 Test 3: Half Year Pass (CG-6M-PASS)"
BODY='{"id":100003,"email":"'$EMAIL'","line_items":[{"title":"ChoreGami School Year Pass","sku":"CG-6M-PASS","quantity":1,"price":"24.99"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY" | jq . 2>/dev/null || cat
echo -e "\n"

# Test 4: CG-12M-PASS (Full Year $39.99)
echo "📦 Test 4: Full Year Pass (CG-12M-PASS)"
BODY='{"id":100004,"email":"'$EMAIL'","line_items":[{"title":"ChoreGami Full Year Pass","sku":"CG-12M-PASS","quantity":1,"price":"39.99"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY" | jq . 2>/dev/null || cat
echo -e "\n"

# Test 5: Idempotency (same order ID should return cached code)
echo "🔁 Test 5: Idempotency Check (repeat order 100004)"
BODY='{"id":100004,"email":"'$EMAIL'","line_items":[{"title":"ChoreGami Full Year Pass","sku":"CG-12M-PASS","quantity":1,"price":"39.99"}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY" | jq . 2>/dev/null || cat
echo -e "\n"

# Test 6: Invalid HMAC (should fail)
echo "🚫 Test 6: Invalid HMAC (should return 401)"
BODY='{"id":100005,"email":"hacker@example.com","line_items":[{"sku":"CG-12M-PASS"}]}'
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid_signature" \
  -d "$BODY"
echo -e "\n"

# Test 7: Unknown SKU (should fail gracefully)
echo "❓ Test 7: Unknown SKU (should return 400)"
BODY='{"id":100006,"email":"'$EMAIL'","line_items":[{"title":"Unknown Product","sku":"UNKNOWN-SKU","quantity":1}]}'
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -s -X POST "$BASE_URL/api/webhooks/shopify/order-paid" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"
echo -e "\n"

echo "✅ Tests complete!"
echo ""
echo "📋 To verify:"
echo "   1. Check server logs for gift code generation"
echo "   2. Check your email inbox for gift code emails"
echo "   3. Query database: SELECT * FROM shopify_orders ORDER BY created_at DESC LIMIT 5;"
echo "   4. Query gift codes: SELECT * FROM gift_codes WHERE source = 'shopify' ORDER BY created_at DESC LIMIT 5;"
