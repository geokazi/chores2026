# Shopify Store URLs & Product Catalog

**Date**: February 8, 2026
**Status**: Password Protected (Not Yet Public)
**Store**: choregami.myshopify.com

---

## ⚠️ Store Launch Checklist

The Shopify store is currently **password-protected** and shows "Opening soon" to visitors. Before using these URLs in marketing:

### To Make Store Public:
1. Go to **Shopify Admin** → **Online Store** → **Preferences**
2. Scroll to **Password protection** section
3. **Uncheck** "Enable password"
4. Click **Save**

### Pre-Launch Verification:
- [ ] Remove password protection
- [ ] Test each product URL loads correctly
- [ ] Verify webhook is receiving test orders
- [ ] Confirm gift code emails are being sent
- [ ] Add product images (see [Image Spec](./20260208_shopify_product_images_spec.md))

---

## Overview

ChoreGami products are available on our Shopify store for automated gift code fulfillment. When customers purchase any product, they automatically receive a gift code via email within minutes.

---

## Store URLs

### Main Store
- **Storefront**: https://choregami.myshopify.com
- **Admin**: https://admin.shopify.com/store/choregami

### Collection
- **Home Page Collection**: https://choregami.myshopify.com/collections/frontpage

---

## Product Catalog

> **Note**: Public URLs require store password protection to be disabled first.

| Product | SKU | Price | Duration | Public URL |
|---------|-----|-------|----------|------------|
| ChoreGami Trial Pass (1 Month) | `CG-1M-TRIAL` | $4.99 | 1 month | [choregami.myshopify.com/products/choregami-trial-pass-1-month](https://choregami.myshopify.com/products/choregami-trial-pass-1-month) |
| ChoreGami Summer Pass (3 Months) | `CG-3M-PASS` | $14.99 | 3 months | [choregami.myshopify.com/products/choregami-summer-pass-3-months](https://choregami.myshopify.com/products/choregami-summer-pass-3-months) |
| ChoreGami School Year Pass (6 Months) | `CG-6M-PASS` | $24.99 | 6 months | [choregami.myshopify.com/products/choregami-school-year-pass-6-months](https://choregami.myshopify.com/products/choregami-school-year-pass-6-months) |
| ChoreGami Full Year Pass (12 Months) | `CG-12M-PASS` | $39.99 | 12 months | [choregami.myshopify.com/products/choregami-full-year-pass-12-months](https://choregami.myshopify.com/products/choregami-full-year-pass-12-months) |

---

## Admin Product URLs

For staff editing products:

| Product | Admin URL |
|---------|-----------|
| Trial Pass (1 Month) | https://admin.shopify.com/store/choregami/products/9377060749537 |
| Full Year Pass (12 Months) | https://admin.shopify.com/store/choregami/products/9377018675425 |

> **Note**: Summer and School Year admin URLs follow the same pattern. Find via Products → Inventory in Shopify Admin.

---

## Product Configuration

### Digital Product Settings
All products are configured as digital products:
- **Shipping**: "Not a physical product" enabled
- **Inventory tracked**: Yes (for reporting)
- **Sell when out of stock**: Should be **On** (unlimited digital inventory)
- **Category**: Computer Software → Educational Software

### SEO Configuration
Each product has optimized search engine listings:
- **Page title**: `ChoreGami [Duration] Pass - Stop the Chore Battles`
- **Meta description**: `Prepaid family access to ChoreGami, the chore management system that helps parents stop nagging and kids build responsibility. Digital delivery, instant setup.`
- **URL handle**: `choregami-[plan]-pass-[duration]`

---

## Fulfillment Flow

```
Customer Purchase → Shopify Webhook → Gift Code Generated → Email Sent
     ↓                    ↓                   ↓                ↓
  Order Paid        HMAC Verified      CHORE-XXXX-XXXX    Resend API
                         ↓
                   SKU Mapping
                   CG-1M-TRIAL → trial
                   CG-3M-PASS → summer
                   CG-6M-PASS → school_year
                   CG-12M-PASS → full_year
```

### Webhook Configuration
- **Endpoint**: `https://choregami.app/api/webhooks/shopify/order-paid`
- **Event**: Order payment
- **Secret**: Stored in Fly.io as `SHOPIFY_WEBHOOK_SECRET`

See [Shopify Webhook Gift Fulfillment](../milestones/20260207_shopify_webhook_gift_fulfillment.md) for technical details.

---

## Marketing Links

> **Important**: These URLs will redirect to "Opening soon" page until password protection is removed. See [Store Launch Checklist](#️-store-launch-checklist) above.

### For Social Media & Ads (Pinterest, Facebook, etc.)
Use the public storefront URLs in marketing materials:
- **Low barrier entry**: https://choregami.myshopify.com/products/choregami-trial-pass-1-month ($4.99)
- **Best value**: https://choregami.myshopify.com/products/choregami-full-year-pass-12-months ($39.99)

### For Email Campaigns
Include direct product links with UTM parameters:
```
https://choregami.myshopify.com/products/choregami-summer-pass-3-months?utm_source=email&utm_medium=newsletter&utm_campaign=summer2026
```

---

## Pricing Strategy

| Tier | Price | Per Month | Target Customer |
|------|-------|-----------|-----------------|
| Trial (1 mo) | $4.99 | $4.99 | Risk-averse, want to try first |
| Summer (3 mo) | $14.99 | $5.00 | Seasonal users, summer break |
| School Year (6 mo) | $24.99 | $4.17 | **Most Popular** - academic year |
| Full Year (12 mo) | $39.99 | $3.33 | **Best Value** - committed families |

> **Competitive positioning**: Priced to match Homey ($4.99/mo) and undercut Chap ($5.99/mo), Chorly ($9/mo). Shopify as differentiated acquisition channel.

---

## Related Documentation

- [Shopify Webhook Gift Fulfillment](../milestones/20260207_shopify_webhook_gift_fulfillment.md) - Technical implementation
- [Shopify Product Images Spec](./20260208_shopify_product_images_spec.md) - Canva design templates
- [Amazon/Shopify Distribution Strategy](./20260206_amazon_whatsapp_distribution_strategy.md) - Multi-channel strategy
- [Marketplace Listings](./20260206_marketplace_listings.md) - Listing copy and assets
- [Distribution Launch Execution](./20260206_distribution_launch_execution.md) - Launch checklist
- [Gift Code Testing Guide](../testing/20260206_gift_code_testing_guide.md) - Test cases for Shopify webhook

---

**Author**: Development Team
**Created**: February 8, 2026
