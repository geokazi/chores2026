# ChoreGami Branding & Theme-Aware Icons

**Date**: February 2, 2026
**Status**: ✅ Complete
**Version**: 2.0

---

## Overview

Comprehensive branding update for ChoreGami, including theme-aware icons, the original purple bird logo, and app name simplification from "ChoreGami 2026" to "ChoreGami".

### Features Delivered

| Feature | Description |
|---------|-------------|
| Favicon | Copied official ChoreGami favicon from fresh-auth repo |
| Landing Page Logo | Inline SVG bird with theme-aware colors (green/blue) |
| Login/Register Logo | Inline SVG bird with blue color (#3b5998) |
| Nav Menu Header | Original purple bird logo (multi-color SVG) |
| Dashboard Nav Item | 🏠 emoji (reverted from bird for clarity) |
| App Rebrand | Simplified name from "ChoreGami 2026" to "ChoreGami" |
| Dark Mode CTA | Updated from amber to blue gradient |

---

## Architecture

### Two Bird Logo Variants

#### 1. Theme-Aware Bird (currentColor)

Used on landing page, login, and register pages. Uses `fill="currentColor"` to inherit color from CSS:

```svg
<svg viewBox="0 0 1024 1024" fill="currentColor">
  <path d="M253 195c7 2 14 5 21 7..."/>
</svg>
```

**Locations:**
- Landing page header (green light / blue dark)
- Login page (blue #3b5998)
- Register page (blue #3b5998)

#### 2. Original Purple Bird (Multi-Color)

The official ChoreGami brand logo with purple gradient colors. Cannot use `currentColor` because it has multiple fill colors:

```
static/ChoreGami-Purple-Bird-in-Flight.svg
Colors: #6B50FE, #5E42FE, #593CFD, #583BFE, #5133FB, etc.
```

**Location:** Nav menu header only (slide-out menu)

### Why Inline SVG vs `<img>`

| Method | `currentColor` Support | Multi-Color SVG | Use Case |
|--------|----------------------|-----------------|----------|
| Inline `<svg>` | ✅ Works | ❌ Loses colors | Theme-aware icons |
| `<img src="*.svg">` | ❌ Doesn't work | ✅ Preserves colors | Purple brand logo |

---

## Design Decisions

### Purple Bird in Main Header - REJECTED

We tested adding the purple bird to the main app header (center bar). This was **removed** because:

1. **Color clash** - Purple (#6B50FE) doesn't harmonize with all themes:
   - Orange/Citrus: Purple vs orange creates visual tension
   - Green/Ocean: Purple on green is jarring
   - Only works naturally on blue theme

2. **White background badge effect** - The logo's rounded white background creates a "floating sticker" look

3. **Visual weight imbalance** - Hamburger (☰) and avatar are simple; detailed logo creates asymmetry

4. **Redundancy** - "ChoreGami" text already identifies the app

**Decision:** Keep purple bird in nav menu header only (brand showcase area).

### Dashboard Icon - 🏠 Emoji

The Dashboard nav item uses 🏠 instead of the bird logo because:
- Universal "home/main page" recognition
- Consistent with other emoji-based nav items (📊 📅 ⚙️)
- Bird logo is for branding, not navigation function

---

## Color Palette

### Landing Page (Theme-Aware)

| Theme | Bird Color | CSS Variable |
|-------|------------|--------------|
| Light Mode | Green #10b981 | `--color-primary` |
| Dark Mode | Blue #60a5fa | Dark mode accent |

### Login/Register Pages

| Element | Color | Hex |
|---------|-------|-----|
| Bird Logo | Blue | #3b5998 |
| Title Text | Blue | #3b5998 |

### Nav Menu Header

| Element | Color |
|---------|-------|
| Purple Bird | Multi-color (preserved from SVG) |
| Brand Text | White |

---

## Files Created

### `static/favicon.ico`

Copied from `/Users/georgekariuki/repos/deno2/fresh-auth/favicon.ico`

### `static/choregami-bird.svg`

Simplified bird with `fill="currentColor"` for theme adaptation.

### `static/ChoreGami-Purple-Bird-in-Flight.svg`

Original brand logo with purple gradient colors (1024x1024).

---

## Files Modified

### `routes/landing.tsx`

- Replaced ✨ emoji with inline SVG bird
- Theme-aware coloring via ThemeToggle.tsx overrides

### `routes/login.tsx`

- Added bird logo next to "ChoreGami 2026" title
- Blue color (#3b5998) matching auth page theme
- Flexbox layout for logo + title alignment

### `routes/register.tsx`

- Added bird logo next to "ChoreGami 2026" title
- Blue color (#3b5998) matching auth page theme

### `islands/AppHeader.tsx`

- Nav menu header: Purple bird image (`<img>` tag)
- Dashboard nav item: 🏠 emoji (reverted from bird SVG)
- Removed `.nav-icon-svg` CSS (no longer used)

### `islands/ThemeToggle.tsx`

- Added `.logo-icon` color rules for light/dark modes
- Updated dark mode CTA from amber to blue gradient

### Multiple Routes (Rebrand)

Changed "ChoreGami 2026" to "ChoreGami" in:
- `routes/_app.tsx` (page title)
- `routes/index.tsx`
- `routes/demo.tsx`
- `routes/setup.tsx`
- `routes/kid/dashboard.tsx`
- `routes/parent/dashboard.tsx`

---

## Implementation Notes

### Theme CSS Location

All theme-specific CSS must be in `ThemeToggle.tsx`:

```
❌ Adding theme rules in landing.tsx or AppHeader.tsx
   → Overridden by ThemeToggle.tsx rules

✅ Adding theme rules in ThemeToggle.tsx
   → Correct location for data-theme-mode overrides
```

### Multi-Color SVG Loading

For the purple bird (multi-color), use `<img>` not inline SVG:

```tsx
// ✅ Correct - preserves multiple fill colors
<img src="/ChoreGami-Purple-Bird-in-Flight.svg" class="nav-logo-img" />

// ❌ Wrong - would need to inline all paths, loses color info with currentColor
<svg>...</svg>
```

---

## Testing Checklist

### Landing Page
- [x] Bird icon visible in light mode (green #10b981)
- [x] Bird icon visible in dark mode (blue #60a5fa)
- [x] Theme toggle switches icon color correctly

### Login/Register Pages
- [x] Bird logo displays with blue color (#3b5998)
- [x] Logo aligned with title text

### Nav Menu
- [x] Purple bird displays in nav menu header
- [x] Multi-color gradient preserved
- [x] Dashboard uses 🏠 emoji

### App Rebrand
- [x] "ChoreGami" (not "ChoreGami 2026") across all pages
- [x] Dark mode CTA uses blue gradient

---

## Git Commits

| Commit | Description |
|--------|-------------|
| `eef5c24` | Initial branding - favicon, landing page logo, nav icons |
| `12b2dff` | Add bird logo to login and register pages |
| `86326d4` | Rebrand to "ChoreGami", update dark mode CTA colors |
| `8cc73be` | Add purple bird to nav menu header |
| `679579e` | Add purple bird to main app header (later reverted) |
| `2f51e63` | Remove logo from main app header (design decision) |
| `6d1f8df` | Use 🏠 emoji for Dashboard menu item |

---

## Related Documentation

- [Landing Page Demand Capture](./20260201_landing_page_demand_capture.md) - Landing page structure
- [Mobile Navigation AppHeader](./20260116_mobile_navigation_appheader.md) - Nav header architecture
- [Confetti Celebrations](./20260125_confetti_celebrations.md) - Other visual enhancements

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Feb 2, 2026 | 1.0 | Initial implementation - favicon, landing page logo, theme-aware coloring |
| Feb 2, 2026 | 2.0 | Login/register logos, purple bird in nav, app rebrand, design refinements |
