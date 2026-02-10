# Shopify Store URLs & Product Catalog

**Date**: February 8, 2026
**Status**: ✅ Live (Public)
**Store**: choregami.myshopify.com

---

## ✅ Store Launch Status

The Shopify store is **live and public** as of February 8, 2026.

### Launch Verification:
- [x] Password protection removed
- [x] Product URLs publicly accessible
- [x] Webhook tested and working
- [x] Gift code emails being sent
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

| Product | SKU | Price | Duration | Public URL |
|---------|-----|-------|----------|------------|
| ChoreGami Trial Pass (1 Month) | `CG-1M-TRIAL` | $4.99 | 1 month | [choregami.myshopify.com/products/choregami-trial-pass-1-month](https://choregami.myshopify.com/products/choregami-trial-pass-1-month) |
| ChoreGami Summer Pass (3 Months) | `CG-3M-PASS` | $14.99 | 3 months | [choregami.myshopify.com/products/choregami-summer-pass-3-months](https://choregami.myshopify.com/products/choregami-summer-pass-3-months) |
| ChoreGami School Year Pass (6 Months) | `CG-6M-PASS` | $29.99 | 6 months | [choregami.myshopify.com/products/choregami-school-year-pass-6-months](https://choregami.myshopify.com/products/choregami-school-year-pass-6-months) |
| ChoreGami Full Year Pass (12 Months) | `CG-12M-PASS` | $49.99 | 12 months | [choregami.myshopify.com/products/choregami-full-year-pass-12-months](https://choregami.myshopify.com/products/choregami-full-year-pass-12-months) |

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

### For Social Media & Ads (Pinterest, Facebook, etc.)
Use the public storefront URLs in marketing materials:
- **Low barrier entry**: https://choregami.myshopify.com/products/choregami-trial-pass-1-month ($4.99)
- **Best value**: https://choregami.myshopify.com/products/choregami-full-year-pass-12-months ($49.99)

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
| School Year (6 mo) | $29.99 | $5.00 | **Most Popular** - academic year |
| Full Year (12 mo) | $49.99 | $4.17 | **Best Value** - committed families |

> **Strategic positioning**: Gift passes and subscriptions aligned at $4.99/mo. Annual subscription $49.99/yr (17% savings). Gift cards serve as acquisition channel.

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
