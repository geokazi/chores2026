# Gift Code Auth Flow Preservation

**Date**: February 7, 2026
**Status**: Implemented
**Category**: Authentication / Gift Codes

---

## Overview

This milestone implements end-to-end gift code preservation through all authentication flows (login, registration, OAuth). Previously, gift codes entered at `/redeem` were lost when users needed to sign in or create an account before redemption.

---

## Problem Statement

### Previous Flow (Broken)

```
1. User visits /redeem with gift code
2. Code validates successfully
3. User clicks "Create Account" → /register
4. User completes signup → redirects to /setup
5. User completes family setup → redirects to /
6. ❌ Gift code is LOST - never applied to family
```

### Root Causes

1. **Parameter mismatch**: `RedeemForm` used `returnTo` param, but `login.tsx` only checked `redirect`
2. **No code preservation**: Gift code not stored through auth flow
3. **Family timing**: `/api/gift/redeem` requires `family_id`, but family doesn't exist until after `/setup`
4. **OAuth redirect loss**: OAuth flows lose query parameters through provider redirects

---

## Solution Architecture

### Key Principle: localStorage Preservation

Store validated gift code in localStorage before auth redirect, then apply after family creation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FIXED GIFT CODE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. /redeem - User enters code                                              │
│     └─ Validates via POST /api/gift/validate                                │
│     └─ On success: localStorage.setItem('pendingGiftCode', code)            │
│                                                                             │
│  2. User clicks "Create Account" or "Sign In"                               │
│     └─ /login?returnTo=/redeem?code=XXX (existing users)                    │
│     └─ /register (new users - code in localStorage)                         │
│                                                                             │
│  3. Auth completes → /setup                                                 │
│     └─ JS checks localStorage for pendingGiftCode                           │
│     └─ Shows "🎁 Your gift is ready!" banner                                │
│     └─ Hidden field populated with code                                     │
│                                                                             │
│  4. Setup form submits                                                      │
│     └─ Creates family + profiles                                            │
│     └─ Calls /api/gift/redeem with { code, familyId: newFamilyId }          │
│     └─ Clears localStorage on success                                       │
│                                                                             │
│  5. Redirect to / with ?gift=activated                                      │
│     └─ Family has prepaid plan applied ✅                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files Modified

| File | Changes |
|------|---------|
| `routes/login.tsx` | Added `returnTo` param support alongside `redirect` |
| `routes/redeem.tsx` | Added `hasFamily` prop to distinguish auth states |
| `islands/RedeemForm.tsx` | Store code in localStorage/sessionStorage on validation, clear on redemption |
| `routes/api/gift/redeem.ts` | Accept explicit `familyId` for setup flow |
| `routes/setup.tsx` | Read pendingGiftCode, show banner, apply after family creation |
| `routes/logout.ts` | Clear all pending tokens including gift codes |
| `routes/index.tsx` | Show success banner when redirected with `?gift=activated` |

---

## Implementation Details

### 1. Login Parameter Fix

**routes/login.tsx** - Support both `redirect` and `returnTo` params:

```typescript
// Before
const existingRedirect = url.searchParams.get("redirect");

// After
const existingRedirect = url.searchParams.get("redirect") || url.searchParams.get("returnTo");
```

### 2. RedeemForm localStorage Storage

**islands/RedeemForm.tsx** - Store on validation:

```typescript
if (data.valid) {
  // Store in localStorage for preservation through auth flow
  localStorage.setItem('pendingGiftCode', code.trim());
  sessionStorage.setItem('pendingGiftCode', code.trim()); // Backup for OAuth

  // Only auto-redeem if logged in AND has family
  if (isLoggedIn && hasFamily) {
    await handleRedeem();
  }
}
```

### 3. Redeem API Explicit FamilyId

**routes/api/gift/redeem.ts** - Accept explicit familyId:

```typescript
const { code, familyId: explicitFamilyId } = await req.json();

// Use explicit familyId if provided (from /setup flow), otherwise from session
const targetFamilyId = explicitFamilyId || session.family?.id;
```

### 4. Setup Flow Integration

**routes/setup.tsx** - Check, display, and apply gift code:

```typescript
// Client-side: Populate hidden field from localStorage
<script>
  var giftCode = localStorage.getItem('pendingGiftCode');
  if (giftCode) {
    document.getElementById('pendingGiftCodeInput').value = giftCode;
  }
</script>

// Server-side: Apply after family creation
const pendingGiftCode = formData.get("pendingGiftCode") as string;
if (pendingGiftCode) {
  await fetch("/api/gift/redeem", {
    method: "POST",
    body: JSON.stringify({ code: pendingGiftCode, familyId: family.id }),
  });
}
```

### 5. hasFamily Prop

**routes/redeem.tsx** and **islands/RedeemForm.tsx**:

```typescript
// Distinguish between:
// - Not logged in → Show "Sign In" / "Create Account" buttons
// - Logged in, no family → Show "Complete Setup" button
// - Logged in with family → Auto-redeem

interface Props {
  isLoggedIn: boolean;
  hasFamily: boolean;  // NEW
}
```

### 6. Dashboard Success Banner

**routes/index.tsx** - Show success banner after gift activation:

```typescript
// In GET handler:
const showGiftSuccess = url.searchParams.get("gift") === "activated";
return ctx.render({ ..., showGiftSuccess });

// In template:
{showGiftSuccess && (
  <div style={{
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    padding: "1rem",
    borderRadius: "0.5rem",
    textAlign: "center",
  }}>
    🎁 Your gift subscription is now active! Enjoy your Family Plan.
  </div>
)}
```

---

## User Experience

### New User with Gift Code

1. Visit `/redeem`, enter code
2. See "✅ Code Valid!" with plan details
3. Click "Create Account"
4. Complete registration
5. See "🎁 Your gift is ready!" banner on setup page
6. Fill family details, click "Get Started"
7. Redirect to dashboard with "🎁 Your gift subscription is now active!" banner

### Existing User with Gift Code

1. Visit `/redeem`, enter code
2. See "✅ Code Valid!" with plan details
3. Click "Sign In"
4. Complete login
5. Redirect back to `/redeem?code=XXX`
6. Auto-validates and auto-redeems
7. See success screen

### Existing User (No Family) with Gift Code

1. Visit `/redeem`, enter code
2. See "✅ Code Valid!" with plan details
3. Already logged in but no family
4. See "Complete your family setup to activate your gift"
5. Click "Complete Setup" → `/setup`
6. Setup flow applies gift code

---

## localStorage Keys

| Key | Purpose | Cleared |
|-----|---------|---------|
| `pendingGiftCode` | Gift code awaiting redemption | On successful redemption, logout, or abandoned flow |
| `pendingGiftPlan` | Plan type for display | Same as above |

Both stored in `localStorage` AND `sessionStorage` for OAuth redirect resilience.

---

## Testing Checklist

- [ ] New user: /redeem → validate → /register → /setup → dashboard (gift applied)
- [ ] Existing user: /redeem → validate → /login → /redeem (auto-redeem)
- [ ] Logged in, no family: /redeem → validate → /setup → dashboard (gift applied)
- [ ] OAuth signup: /redeem → validate → Google OAuth → /setup → dashboard
- [ ] Logout clears pendingGiftCode from localStorage
- [ ] Gift code banner shows on /setup when pending code exists
- [ ] Dashboard shows success banner when redirected with ?gift=activated
- [ ] Code cleared from localStorage after successful redemption
- [ ] returnTo param works in /login (not just redirect)

---

## Security Considerations

- **Gift codes are one-time use**: Server validates code isn't already redeemed
- **localStorage is acceptable**: Codes are meant to be shared/distributed
- **No sensitive data exposed**: Only the code string is stored
- **Explicit familyId validated**: API still requires authenticated session

---

## Related Documentation

- [Template Gating & Gift Codes](./20260118_template_gating_gift_codes.md) - Gift code system overview
- [Admin Page Access Control](../decisions/20260206_admin_page_access_control.md) - Admin panel for gift codes
- [Business Requirements](../business-requirements.md) - Monetization strategy

---

## Future Enhancements

- **Deep link support**: `/redeem/GIFT-XXXX` format for cleaner URLs
- **Gift code in email magic links**: Embed code in signup link
- **Analytics tracking**: Track conversion funnel from code validation to redemption

---

**Author**: Development Team
**Created**: February 7, 2026
