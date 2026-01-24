# OAuth Signup Redirect Fix

**Date**: January 23, 2026
**Status**: ✅ Complete
**Commits**: `45cb838`, `0e874cb`, `d3a4882`

---

## Problem Summary

After Google OAuth signup (from `/register` or `/login`), new users were redirected back to the login page instead of reaching the `/setup` profile-completion form. This created an infinite redirect loop.

### Observed Behavior

```
User clicks "Continue with Google" on /register
  → Google OAuth completes successfully
  → Browser returns to /login#access_token=...&refresh_token=...
  → Fragment handler processes tokens, sets cookies
  → Redirect fires, but user stays on /login (or bounces /setup → /login)
  → User sees the login form with no error message
```

### Root Cause (Multi-layered)

Three issues compounded to create the loop:

1. **Hash fragment stripping**: Server-side 303 redirects strip `#fragment` data. The original `redirectTo: ${origin}/` caused Supabase to redirect to the root, which server-side redirected to `/login`, losing the fragment.

2. **Same-page navigation no-op**: After fixing #1, the fragment handler used `window.location.href = "/login"` to navigate — but the browser was already ON `/login`, so nothing happened.

3. **Server-side getUser failure**: After fixing #2 with `window.location.reload()`, the server-side `supabase.auth.getUser(accessToken)` call in both `login.tsx` and `setup.tsx` was failing silently, causing both pages to render the login form or bounce users back to `/login`.

---

## Solution

Applied the **mealplanner pattern** of client-side routing after OAuth, eliminating dependency on server-side token validation for post-OAuth navigation.

### Fix 1: SocialAuthButtons redirectTo (commit `45cb838`)

```typescript
// BEFORE: Redirected to root, which 303'd to /login (stripping fragment)
redirectTo: redirectTo || `${origin}/`,

// AFTER: Redirect to /login directly (preserves fragment)
redirectTo: redirectTo || `${origin}/login`,
```

### Fix 2: Fragment handler navigation (commits `0e874cb`, `d3a4882`)

```javascript
// BEFORE (attempt 1): No-op when already on /login
window.location.href = "/login";

// BEFORE (attempt 2): Relies on server-side routing
window.location.reload();

// AFTER: Direct client-side routing (mealplanner pattern)
window.location.replace("/setup");
```

The fragment handler now navigates directly to `/setup`, which handles both cases:
- **New user** (no family profile): Renders the setup form
- **Existing user** (has profile): Redirects to `/`

### Fix 3: Resilient setup.tsx GET handler (commit `d3a4882`)

```typescript
// BEFORE: Bounced to /login if getUser failed (infinite loop)
const { data: { user } } = await supabase.auth.getUser(accessToken);
if (!user) {
  return redirect("/login");
}

// AFTER: Render form anyway, log the error
const { data, error: getUserError } = await supabase.auth.getUser(accessToken);
const user = data?.user;
if (getUserError) {
  console.log("⚠️ Setup getUser error (rendering form anyway):", getUserError.message);
}
// Render setup form — POST handler validates token on submission
return ctx.render({ email: user?.email, error });
```

---

## OAuth Signup Flow (Final)

```
1. User on /register (or /login) selects "Social" → clicks "Continue with Google"
2. SocialAuthButtons calls supabase.auth.signInWithOAuth({ provider: "google" })
   - redirectTo: ${origin}/login (preserves fragment on return)
3. Google OAuth consent screen → user approves
4. Supabase redirects browser to: /login#access_token=...&refresh_token=...
5. Login page loads, oauth-fragment-handler.js executes:
   a. Parses hash fragment, extracts access_token + refresh_token
   b. Decodes JWT to get user metadata
   c. Stores user data in localStorage (chores2026_user_data)
   d. Sets sb-access-token and sb-refresh-token cookies
   e. Cleans URL (removes hash)
   f. After 150ms delay: window.location.replace("/setup")
6. Setup page GET handler:
   a. Reads sb-access-token cookie
   b. Calls getUser(accessToken) — if fails, logs warning, renders form anyway
   c. If user exists and has profile → redirects to /
   d. Otherwise → renders profile setup form
7. User fills form → POST submits → creates family + profile → redirects to /
```

---

## Key Architectural Decision

**Client-side routing after OAuth** (matching mealplanner pattern):
- Don't rely on server-side `getUser()` for post-OAuth navigation
- The fragment handler knows the destination (`/setup`) and routes directly
- Server-side validation happens on form submission (POST), not on page load (GET)
- This prevents infinite loops when token propagation has latency

---

## Files Modified

| File | Change |
|------|--------|
| `islands/auth/SocialAuthButtons.tsx` | Default `redirectTo` → `${origin}/login` |
| `static/oauth-fragment-handler.js` | `window.location.replace("/setup")` instead of reload |
| `routes/login.tsx` | Added getUser error logging in GET handler |
| `routes/setup.tsx` | Render form on getUser failure (break redirect loop) |

---

## Testing

1. Navigate to `/register` → select "Social" → click "Continue with Google"
2. Complete Google OAuth consent
3. Should land on `/setup` form (not `/login`)
4. Fill in parent name + family name → submit
5. Should redirect to `/` (home/kid selector)

### Server-side debugging

If the flow still fails, check server logs for:
```
⚠️ Setup getUser error (rendering form anyway): <error message>
```

This indicates why `getUser` is failing (token expiry, project mismatch, network issue).

---

## Cross-References

- [Legal Pages & Auth Flow Fixes](./20260118_legal_pages_auth_flow_fixes.md) — Phone OTP redirect fix (same pattern: avoid Supabase redirect, verify locally)
- [Authentication Security Hardening](./20260118_authentication_security_hardening.md) — Rate limiting, honeypot, enumeration protection
- [Signup & PIN Detection Fixes](./20260119_signup_and_pin_fixes.md) — Supabase schema config blocking signups
- [Session Management](../session-management.md) — Multi-layer session architecture
- [Architecture: Authentication Flow](../architecture.md#authentication-flow) — High-level auth flow diagram
- [SMS 10DLC Compliance](../planned/20260123_sms_10dlc_compliance.md) — Related carrier delivery issue (same session)

---

*Created: January 23, 2026*
*Pattern source: mealplanner `static/oauth-fragment-handler.js` + `static/oauth-signup-handler.js`*
