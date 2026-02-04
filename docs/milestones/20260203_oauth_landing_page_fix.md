# OAuth Landing Page Fix (Fly.io Domain Migration)

**Date**: February 3, 2026
**Status**: ✅ Complete
**Commit**: `01fa32a`
**Related**: [Domain Migration Guide](../domains/20260203_flyio_migration_guide.md), [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md)

---

## Problem Summary

After completing the DNS migration from Google Cloud Run to Fly.io (choregami.app → Fly.io IPs), OAuth authentication failed because the token fragment was landing on `/landing` instead of `/login` where the fragment handler was located.

### Observed Behavior

```
User clicks "Continue with Google" on /login
  → Google OAuth completes successfully
  → Supabase redirects to choregami.app/landing#access_token=...&refresh_token=...
  → Landing page loads BUT no fragment handler present
  → Tokens ignored, user sees landing page instead of being logged in
```

### Root Cause

When the domain migration was completed, Supabase's OAuth redirect behavior combined with the application's unauthenticated user routing caused tokens to land on `/landing`:

1. **Supabase Site URL Configuration**: Configured to redirect to the app root
2. **App Routing Logic**: Unauthenticated users visiting `/` are redirected to `/landing`
3. **Fragment Handler Location**: `oauth-fragment-handler.js` was only included on `/login` and `/register`, not on `/landing`
4. **Fragment Preservation**: The redirect from `/` to `/landing` preserved the URL fragment, but no handler existed to process it

---

## Solution

Added `oauth-fragment-handler.js` to the landing page so that OAuth tokens arriving via any entry point are properly processed.

### Code Change

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

```
1. User on /landing (or /login or /register) clicks "Continue with Google"
2. SocialAuthButtons calls supabase.auth.signInWithOAuth({ provider: "google" })
   - redirectTo: ${origin}/auth/callback (or as configured)
3. Google OAuth consent screen → user approves
4. Supabase redirects to app with fragment: /landing#access_token=...&refresh_token=...
   (or /login#... depending on entry point)
5. Page loads, oauth-fragment-handler.js executes:
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
| OAuth landing on `/login` | ✅ Handler processes tokens | ✅ Handler processes tokens |
| OAuth landing on `/register` | ✅ Handler processes tokens | ✅ Handler processes tokens |
| OAuth landing on `/landing` | ❌ Tokens ignored | ✅ Handler processes tokens |
| Direct navigation to `/landing` | ✅ Works normally | ✅ Works normally |

### Same Handler, Multiple Entry Points

The same `oauth-fragment-handler.js` is now included on three pages:
- `/login` - Original location
- `/register` - Original location
- `/landing` - **New** (this fix)

This ensures OAuth tokens are processed regardless of where Supabase redirects the user.

---

## Files Modified

| File | Change |
|------|--------|
| `routes/landing.tsx` | Added `<script src="/oauth-fragment-handler.js">` |

No changes to:
- `static/oauth-fragment-handler.js` (unchanged)
- `islands/auth/SocialAuthButtons.tsx` (unchanged)
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
| OAuth Fragment Fix | ✅ Complete (Feb 3) | **This milestone** |
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
*Pattern source: [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md)*
