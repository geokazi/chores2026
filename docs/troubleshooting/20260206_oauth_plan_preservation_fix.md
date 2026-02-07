# OAuth Plan Preservation Fix

**Date**: February 6, 2026
**Issue**: Plan selection lost during OAuth signup for returning users
**Status**: ✅ Fixed
**Commit**: `ba2e74e`

---

## Problem Description

When a user selected a plan on `/pricing` before signing up, and then completed OAuth (Google/Facebook) authentication, the plan selection was lost. The user landed on the home page instead of being redirected to Stripe checkout.

### Affected Flow

1. User visits `/pricing` (unauthenticated)
2. User clicks "Select" on a plan (e.g., "Full Year")
3. PricingCard stores `pendingPlanSelection` in localStorage
4. User is redirected to `/register`
5. User clicks "Sign in with Google"
6. OAuth completes, user returns to app
7. **Expected**: Redirect to `/pricing?checkout=full_year` → Stripe
8. **Actual**: User lands on `/` (home page), plan selection lost

---

## Root Cause Analysis

### OAuth Redirect Flow

```
/register → Google OAuth → /login#access_token=...
           ↓
oauth-fragment-handler.js sets cookies → /setup
           ↓
setup.tsx GET handler
```

### The Bug in setup.tsx GET Handler

```typescript
// Lines 53-55 (BEFORE fix)
if (existingProfile) {
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
```

**Problem**: This is a **server-side redirect**. The JavaScript that checks localStorage never runs because:

1. Server receives request with cookies
2. Server finds existing profile (returning user)
3. Server immediately responds with 303 redirect to `/`
4. Browser follows redirect without executing any JavaScript
5. localStorage `pendingPlanSelection` is never checked

### Why It Worked for New Users

New users (no existing profile) saw the setup form:
1. User fills out setup form and submits
2. POST handler creates family/profile
3. POST handler returns HTML page with JavaScript
4. JavaScript checks localStorage and redirects to `/pricing?checkout=...`

The bug only affected **returning users** who already had an account.

---

## The Fix

Changed server-side redirect to return an HTML page with JavaScript that checks localStorage first.

### Before (Buggy)

```typescript
if (existingProfile) {
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
```

### After (Fixed)

```typescript
if (existingProfile) {
  // Check for pending plan selection via client-side script
  // (localStorage isn't accessible server-side)
  return new Response(
    `<!DOCTYPE html><html><head><title>Redirecting...</title></head>
    <body>
      <script>
        var pendingPlan = localStorage.getItem('pendingPlanSelection');
        if (pendingPlan) {
          localStorage.removeItem('pendingPlanSelection');
          window.location.href = '/pricing?checkout=' + pendingPlan;
        } else {
          window.location.href = '/';
        }
      </script>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
```

### Applied To

Both GET and POST handlers in `routes/setup.tsx` were updated:
- GET handler (line 53): For returning OAuth users
- POST handler (line 139): For edge cases where form submitted but profile exists

---

## Key Insight

**localStorage is only accessible in the browser, not on the server.**

When you need to check localStorage during a redirect flow, you must:
1. Return an HTML page (not a 303 redirect)
2. Include JavaScript that runs in the browser
3. Let the JavaScript read localStorage and handle the redirect

This is a common pattern when bridging server-side authentication with client-side state.

---

## Files Changed

| File | Change |
|------|--------|
| `routes/setup.tsx` | Both GET and POST handlers return HTML with localStorage check |

---

## Testing

### Test Case: Returning User with Plan Selection

1. Create a family account (signup, setup)
2. Log out
3. Go to `/pricing` in incognito
4. Click "Select" on Full Year plan
5. Click "Sign up" → Go to `/register`
6. Click "Sign in with Google" (use same Google account)
7. **Expected Result**: Redirected to `/pricing?checkout=full_year` → Stripe checkout opens
8. **Actual Result**: ✅ Works correctly after fix

### Test Case: New User with Plan Selection

1. Go to `/pricing` in incognito (not logged in)
2. Click "Select" on School Year plan
3. Click "Sign up" → Go to `/register`
4. Click "Sign in with Google" (new Google account)
5. Complete setup form
6. **Expected Result**: Redirected to `/pricing?checkout=school_year` → Stripe checkout opens
7. **Actual Result**: ✅ Works correctly (this already worked before fix)

---

## Related Documents

- [Stripe Checkout Implementation](../milestones/20260206_stripe_checkout_implementation.md)
- [OAuth Signup Redirect Fix](../milestones/20260123_oauth_signup_redirect_fix.md)
- [Session Management](../session-management.md)

---

## Prevention

For future OAuth flows that need to preserve client-side state:

1. **Never use 303 redirects** when localStorage needs to be checked
2. **Always return HTML with JavaScript** to bridge server auth → client state
3. **Document the pattern** in the codebase (see this file)

---

**Fixed by**: Development Team
**Date**: February 6, 2026
