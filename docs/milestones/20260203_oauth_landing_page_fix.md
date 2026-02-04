# OAuth Landing Page Fix (Fly.io Domain Migration)

**Date**: February 3, 2026
**Status**: ✅ Complete
**Commits**: `01fa32a`, `523d192`
**Related**: [Domain Migration Guide](../domains/20260203_flyio_migration_guide.md), [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md)

---

## Problem Summary

After completing the DNS migration from Google Cloud Run to Fly.io (choregami.app → Fly.io IPs), OAuth authentication failed due to two issues:

1. Token fragments were landing on `/landing` instead of `/login` where the handler was located
2. `SocialAuthButtons.tsx` was configured to redirect to `/auth/callback` which doesn't exist

### Observed Behavior

```
User clicks "Continue with Google" on /login
  → Google OAuth completes successfully
  → SocialAuthButtons requested redirect to /auth/callback (doesn't exist!)
  → Fresh has no handler → cascades to / → redirects to /landing
  → Supabase redirects to choregami.app/landing#access_token=...&refresh_token=...
  → Landing page loads BUT no fragment handler present
  → Tokens ignored, user sees landing page instead of being logged in
```

### Root Cause (Two Issues)

**Issue 1: Missing Fragment Handler on Landing Page**

1. **App Routing Logic**: Unauthenticated users visiting `/` are redirected to `/landing`
2. **Fragment Handler Location**: `oauth-fragment-handler.js` was only on `/login` and `/register`
3. **Fragment Preservation**: Redirects preserved the URL fragment, but no handler existed on `/landing`

**Issue 2: Invalid OAuth Redirect URL**

1. **Misconfigured redirectTo**: `SocialAuthButtons.tsx` used `${origin}/auth/callback`
2. **Route Doesn't Exist**: No `/auth/callback` route in Fresh application
3. **Cascading Redirects**: Non-existent route → root `/` → `/landing` (for unauthenticated users)

---

## Solution

Two fixes were applied:

### Fix 1: Add Fragment Handler to Landing Page (commit `01fa32a`)

Added `oauth-fragment-handler.js` to the landing page as a safety net for any tokens that land there.

```typescript
// routes/landing.tsx
export default function LandingPage() {
  return (
    <div class="landing-page">
      {/* OAuth fragment handler - processes tokens from OAuth redirects */}
      <script src="/oauth-fragment-handler.js"></script>

      {/* Header */}
      <header class="landing-header">
        // ... rest of landing page
```

### Fix 2: Correct OAuth Redirect URL (commit `523d192`)

Changed the OAuth redirect from non-existent `/auth/callback` to `/login` where the user initiated the flow.

```typescript
// islands/SocialAuthButtons.tsx

// BEFORE (broken - route doesn't exist)
const finalRedirectTo = redirectTo || `${origin}/auth/callback`;

// AFTER (correct - user returns where they started)
// Redirect back to /login where the user initiated OAuth
// The oauth-fragment-handler.js on /login will process the tokens
const finalRedirectTo = redirectTo || `${origin}/login`;
```

This eliminates the cascading redirect chain and sends users directly back to `/login` where the fragment handler has been battle-tested since January 2026.

### Fix 3: Supabase Redirect URLs Configuration

**Critical**: The code change alone wasn't sufficient. Supabase must have the redirect URLs in its allowlist, otherwise it ignores the `redirectTo` parameter and falls back to the Site URL.

**Supabase Dashboard → Authentication → URL Configuration:**

| Setting | Value |
|---------|-------|
| Site URL | `https://choregami.app/` |
| Redirect URLs | Must include wildcards for all domains |

**Required Redirect URLs:**
```
https://choregami.app/**
https://www.choregami.app/**
https://choregami.fly.dev/**
http://localhost:8000/
```

**Why wildcards are needed:**
- `https://choregami.app/**` covers `/login`, `/landing`, `/register`, etc.
- `https://www.choregami.app/**` covers www subdomain (users may access via www)
- Without matching redirect URL, Supabase ignores `redirectTo` parameter

### How the Fragment Handler Works

The `oauth-fragment-handler.js` script (already production-tested) performs these steps:

1. **Token Detection**: Checks for `#access_token=` in URL fragment
2. **JWT Parsing**: Decodes the access token to extract user metadata
3. **Cookie Setting**: Sets `sb-access-token` and `sb-refresh-token` as cookies
4. **localStorage Storage**: Stores user data for client-side components
5. **URL Cleanup**: Removes the fragment from the browser URL
6. **Client-Side Routing**: Redirects to `/setup` after 150ms delay

```javascript
// Key fragment handler logic (from static/oauth-fragment-handler.js)
if (hash && hash.includes("access_token=")) {
  // Parse tokens, set cookies, store user data
  // ...

  // Clean URL and redirect to setup
  window.history.replaceState({}, "", cleanUrl);
  setTimeout(() => {
    window.location.replace("/setup");
  }, 150);
}
```

---

## OAuth Flow After Fix

### Primary Flow (Direct to /login)

```
1. User on /login clicks "Continue with Google"
2. SocialAuthButtons calls supabase.auth.signInWithOAuth({ provider: "google" })
   - redirectTo: ${origin}/login ← FIXED (was /auth/callback)
3. Google OAuth consent screen → user approves
4. Supabase redirects to: /login#access_token=...&refresh_token=...
5. Page loads, oauth-fragment-handler.js on /login executes:
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

### Fallback Flow (Landing Page Safety Net)

If tokens ever land on `/landing` (e.g., from external links or Supabase Site URL override):

```
1. Browser arrives at /landing#access_token=...
2. oauth-fragment-handler.js on /landing processes tokens
3. Same flow as above from step 5 onwards
```

---

## Deployment

Deployed via the existing Fly.io deployment pipeline:

```bash
# Deployment command used
./deployment/deploy.sh

# Deployment details
- App: choregami
- Region: sjc (San Jose)
- Build: Docker image with Deno Fresh
- Total deployment time: 82 seconds
```

### Verification

```bash
# Verify handler script is present on landing page
curl -s https://choregami.app/landing | grep -o 'oauth-fragment-handler'
# Output: oauth-fragment-handler ✅

# Verify script is accessible
curl -s https://choregami.app/oauth-fragment-handler.js | head -5
# Output: (function declaration visible) ✅

# Verify domain resolution
dig choregami.app A +short
# Output: 66.241.125.185 (Fly.io IP) ✅

# Verify SSL certificate
curl -I https://choregami.app
# Output: HTTP/2 303, server: Fly ✅
```

---

## Compatibility with Previous OAuth Fix

This fix **extends** the [OAuth Signup Redirect Fix (20260123)](./20260123_oauth_signup_redirect_fix.md) without breaking existing functionality:

| Scenario | Before This Fix | After This Fix |
|----------|-----------------|----------------|
| OAuth from `/login` | ❌ Redirected to non-existent `/auth/callback` | ✅ Returns to `/login`, handler processes |
| OAuth from `/register` | ❌ Same cascading redirect issue | ✅ Returns to `/login`, handler processes |
| OAuth landing on `/landing` | ❌ Tokens ignored (no handler) | ✅ Handler processes tokens (safety net) |
| Direct navigation to `/landing` | ✅ Works normally | ✅ Works normally |

### Defense in Depth

The two fixes provide layered protection:

1. **Fix 2 (Primary)**: OAuth redirects directly to `/login` where user started
   - Clean flow, no cascading redirects
   - Battle-tested handler location

2. **Fix 1 (Safety Net)**: Handler on `/landing` catches edge cases
   - External links with token fragments
   - Supabase Site URL override scenarios
   - Any other unexpected token delivery

### Fragment Handler Locations

The same `oauth-fragment-handler.js` is now included on three pages:
- `/login` - **Primary** (where OAuth redirects after Fix 2)
- `/register` - Original location
- `/landing` - **Safety net** (Fix 1)

---

## Files Modified

| File | Change | Commit |
|------|--------|--------|
| `routes/landing.tsx` | Added `<script src="/oauth-fragment-handler.js">` | `01fa32a` |
| `islands/SocialAuthButtons.tsx` | Changed redirectTo from `/auth/callback` to `/login` | `523d192` |

No changes to:
- `static/oauth-fragment-handler.js` (unchanged)
- `routes/login.tsx` (unchanged)
- `routes/setup.tsx` (unchanged)

---

## Testing Checklist

### OAuth Flow Testing

- [x] Visit https://choregami.app/login → Google OAuth → should authenticate
- [x] Visit https://choregami.app/register → Google OAuth → should authenticate
- [x] Visit https://choregami.app/landing → Google OAuth → should authenticate
- [x] Direct link with token fragment on `/landing` → should process

### Regression Testing

- [x] Non-OAuth landing page visit works normally (no fragment)
- [x] Email/password login still works
- [x] Phone/SMS login still works (when 10DLC approved)
- [x] Existing authenticated sessions preserved

---

## Domain Migration Context

This fix was discovered during the Fly.io domain migration:

| Phase | Status | Description |
|-------|--------|-------------|
| Fly.io App Deployed | ✅ Complete (Jan 13) | https://choregami.fly.dev |
| DNS Migration | ✅ Complete (Feb 3) | choregami.app → Fly.io IPs |
| SSL Certificates | ✅ Complete (Feb 3) | Let's Encrypt issued |
| OAuth Fix 1: Landing Handler | ✅ Complete (Feb 3) | `01fa32a` - Safety net on /landing |
| OAuth Fix 2: Correct Redirect | ✅ Complete (Feb 3) | `523d192` - Direct to /login |
| OAuth Fix 3: Supabase Config | ✅ Complete (Feb 3) | Added `www.choregami.app/**` to allowlist |
| GCP Cleanup | Pending | After 24-48 hours monitoring |

See [Domain Migration Guide](../domains/20260203_flyio_migration_guide.md) for complete migration details.

---

## Key Architectural Decision

**Client-side token processing is entry-point agnostic**:

The `oauth-fragment-handler.js` pattern (established in [20260123_oauth_signup_redirect_fix.md](./20260123_oauth_signup_redirect_fix.md)) handles OAuth tokens entirely client-side, making it safe to include on any page that might receive OAuth redirects. The handler:

1. Only activates when `#access_token=` is present
2. Is idempotent (safe to include multiple times)
3. Routes to `/setup` for unified post-auth handling
4. Doesn't rely on server-side token validation for navigation

This pattern ensures OAuth authentication works regardless of:
- DNS configuration changes
- Server-side redirect logic
- Supabase Site URL settings
- User entry point to the application

---

## Cross-References

- [Domain Migration Guide](../domains/20260203_flyio_migration_guide.md) — DNS migration that triggered this fix
- [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md) — Original fragment handler implementation
- [Fly.io Deployment Migration Guide](../20260111_flyio_deployment_migration_guide.md) — Initial migration assessment
- [Session Management](../session-management.md) — Multi-layer session architecture
- [Architecture: Authentication Flow](../architecture.md#authentication-flow) — High-level auth flow diagram

---

*Created: February 3, 2026*
*Updated: February 3, 2026 (added Fix 2: correct OAuth redirect URL)*
*Pattern source: [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md)*
