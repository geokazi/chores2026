# Shopify Product Images Specification

**Date**: February 8, 2026
**Status**: Ready for Design
**Category**: Marketing / E-commerce

---

## Overview

Specifications for creating product images for the ChoreGami Shopify store. These images will appear on the homepage collection and individual product pages.

---

## Image Requirements

### Technical Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 1200 x 1200 px (square, Shopify standard) |
| **Format** | PNG (for transparency) or JPG (for photos) |
| **File size** | < 500KB per image |
| **Color mode** | sRGB |
| **Resolution** | 72 DPI (web optimized) |

### Recommended Image Count Per Product

- **Primary image**: Product card (shows in collection grid)
- **Secondary image**: App screenshot or feature highlight
- **Optional**: Lifestyle/family image

---

## Brand Colors

Use ChoreGami's Fresh Meadow theme palette:

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary Green** | `#10b981` | Buttons, accents, success states |
| **Dark Green** | `#064e3b` | Text, headers |
| **Mint Cream** | `#f0fdf4` | Backgrounds |
| **Sky Blue** | `#3b82f6` | Secondary accents |
| **Amber** | `#f59e0b` | Highlights, badges |
| **Gold** | `#eab308` | "Best Value" badge |
| **White** | `#ffffff` | Card backgrounds |

---

## Product Image Designs

### Template Structure (All Products)

```
┌─────────────────────────────────────────┐
│                                         │
│           [BADGE - top right]           │
│                                         │
│         ┌─────────────────────┐         │
│         │                     │         │
│         │    APP MOCKUP       │         │
│         │    (phone frame)    │         │
│         │                     │         │
│         └─────────────────────┘         │
│                                         │
│          PRODUCT NAME                   │
│          $XX.XX                         │
│          "Tagline"                      │
│                                         │
└─────────────────────────────────────────┘
```

---

### Product 1: ChoreGami Trial Pass (1 Month)

**SKU**: `CG-1M-TRIAL`
**Price**: $4.99

| Element | Specification |
|---------|---------------|
| **Badge** | "TRY IT" - Sky Blue (`#3b82f6`) with white text |
| **Badge shape** | Rounded rectangle, top-right corner |
| **Background** | Soft gradient: White to Light Blue (`#f0f9ff`) |
| **App mockup** | Kid dashboard showing "Today's Chores" |
| **Headline** | "ChoreGami Trial" |
| **Subhead** | "1 Month Access" |
| **Tagline** | "See the difference in just 30 days" |
| **Price display** | "$4.99" in Primary Green |

**Canva Search Terms**: "mobile app mockup", "phone frame", "soft gradient background"

---

### Product 2: ChoreGami Summer Pass (3 Months)

**SKU**: `CG-3M-PASS`
**Price**: $14.99

| Element | Specification |
|---------|---------------|
| **Badge** | "SUMMER SPECIAL" - Amber (`#f59e0b`) with white text |
| **Badge shape** | Rounded rectangle with sun icon |
| **Background** | Warm gradient: White to Soft Orange (`#fff7ed`) |
| **App mockup** | Leaderboard showing family rankings |
| **Headline** | "Summer Pass" |
| **Subhead** | "3 Months of Family Fun" |
| **Tagline** | "Conquer summer chaos - just $5/month" |
| **Price display** | "$14.99" with "~$5/mo" below in smaller text |

**Canva Search Terms**: "summer", "sunshine", "family fun"

---

### Product 3: ChoreGami School Year Pass (6 Months)

**SKU**: `CG-6M-PASS`
**Price**: $24.99

| Element | Specification |
|---------|---------------|
| **Badge** | "MOST POPULAR" - Primary Green (`#10b981`) with white text + star icon |
| **Badge shape** | Ribbon/banner style, prominent |
| **Background** | Fresh gradient: White to Mint (`#f0fdf4`) |
| **App mockup** | Points celebration screen with confetti |
| **Headline** | "School Year Pass" |
| **Subhead** | "6 Months - Save 17%" |
| **Tagline** | "From back-to-school to spring break" |
| **Price display** | "~~$29.99~~ $24.99" with strikethrough |
| **Savings callout** | "Just $4.17/month" in green badge |

**Canva Search Terms**: "school", "education", "achievement", "popular badge"

---

### Product 4: ChoreGami Full Year Pass (12 Months)

**SKU**: `CG-12M-PASS`
**Price**: $39.99

| Element | Specification |
|---------|---------------|
| **Badge** | "BEST VALUE - SAVE 33%" - Gold (`#eab308`) with dark text |
| **Badge shape** | Star burst or shield shape, largest badge |
| **Background** | Premium gradient: White to Soft Gold (`#fefce8`) |
| **App mockup** | Family reports/insights screen |
| **Headline** | "Full Year Pass" |
| **Subhead** | "12 Months of Family Harmony" |
| **Tagline** | "A full year for less than a coffee/week" |
| **Price display** | "~~$79.99~~ $39.99" with prominent strikethrough |
| **Savings callout** | "Only $3.33/month!" in gold starburst |

**Canva Search Terms**: "premium", "gold badge", "best value", "yearly subscription"

---

## App Screenshots to Capture

Capture these screens from ChoreGami for use in mockups:

| Screen | File Name | Usage |
|--------|-----------|-------|
| Kid Dashboard (Today's Chores) | `screenshot_kid_dashboard.png` | Trial Pass primary |
| Family Leaderboard | `screenshot_leaderboard.png` | Summer Pass primary |
| Completion Celebration | `screenshot_celebration.png` | School Year primary |
| Family Reports/Insights | `screenshot_reports.png` | Full Year primary |
| Points Balance | `screenshot_balance.png` | Secondary image |
| Rewards Catalog | `screenshot_rewards.png` | Secondary image |

**Screenshot dimensions**: 390 x 844 px (iPhone 14 Pro)

---

## Canva Template Setup

### Step 1: Create New Design
- Select "Custom size": 1200 x 1200 px
- Name: "ChoreGami Shopify - [Product Name]"

### Step 2: Background
- Add gradient using brand colors
- Keep it subtle (10-20% opacity shift)

### Step 3: Phone Mockup
- Search "iPhone mockup" in Elements
- Position center, ~60% of canvas height
- Insert app screenshot into frame

### Step 4: Badge
- Use "Shapes" → Rounded rectangle or search "badge"
- Position top-right corner
- Add text with brand font (Inter or similar sans-serif)

### Step 5: Text Hierarchy
- **Product name**: 48-56px, Bold, Dark Green
- **Subhead**: 28-32px, Medium, Dark Green
- **Tagline**: 20-24px, Regular, Gray (`#6b7280`)
- **Price**: 36-44px, Bold, Primary Green

### Step 6: Export
- File → Download → PNG
- Quality: High
- Name: `choregami_[sku]_primary.png`

---

## Secondary Images (Optional)

### Feature Highlight Cards

Create simple cards highlighting key features:

**Card 1: Points & Streaks**
- Icon: Fire emoji or streak icon
- Text: "Kids love earning points"
- Screenshot: Points celebration

**Card 2: No Nagging**
- Icon: Checkmark or peace sign
- Text: "Automatic reminders"
- Screenshot: Notification preview

**Card 3: Family Dashboard**
- Icon: Family/people icon
- Text: "See everyone's progress"
- Screenshot: Parent dashboard

---

## Lifestyle Image Ideas

If budget allows, consider:
- Stock photo of happy family at home
- Kids doing chores with smiles
- Parent and child high-fiving
- Phone showing app with family in background (blurred)

**Stock photo sources**:
- Unsplash (free)
- Pexels (free)
- Shutterstock (paid, higher quality)

**Search terms**: "family chores", "kids helping", "happy family home", "children responsibility"

---

## Implementation Checklist

- [ ] Create 1 Month Trial primary image
- [ ] Create 3 Month Summer primary image
- [ ] Create 6 Month School Year primary image
- [ ] Create 12 Month Full Year primary image
- [ ] Upload to Shopify Products → Media
- [ ] Verify images display correctly in collection
- [ ] Test mobile display (square crop)
- [ ] Add alt text for accessibility

---

## Alt Text Templates

For accessibility and SEO, add alt text to each image:

| Product | Alt Text |
|---------|----------|
| 1 Month | "ChoreGami Trial Pass - 1 month family chore app subscription for $4.99" |
| 3 Month | "ChoreGami Summer Pass - 3 months family access, save on summer chores" |
| 6 Month | "ChoreGami School Year Pass - Most popular, 6 months for $24.99" |
| 12 Month | "ChoreGami Full Year Pass - Best value, 12 months for $39.99, save 33%" |

---

## Related Documentation

- [Shopify Webhook Gift Fulfillment](../milestones/20260207_shopify_webhook_gift_fulfillment.md) - SKU mapping
- [Amazon/Shopify Distribution Strategy](./20260206_amazon_whatsapp_distribution_strategy.md) - Sales channels
- [Marketplace Listings](./20260206_marketplace_listings.md) - Product copy
- [Business Requirements](../business-requirements.md) - Pricing strategy
- [Admin SKU Management](../decisions/20260206_admin_page_access_control.md#shopify-sku-admin-adminshopify-skus) - SKU admin panel

---

**Author**: Development Team
**Created**: February 8, 2026
