# Decision: OAuth Invite Token Preservation via localStorage Bridge

**Date**: January 28, 2026
**Status**: Implemented
**Priority**: P1 (Bug Fix)

---

## Context

When users click a family invite link (`/join?token=xxx`) and authenticate via OAuth (Google, Facebook), the invite token was being lost during the redirect flow. New users ended up at `/setup` without any way to join the invited family.

### Problem Flow (Before Fix)

```
1. User clicks: /join?token=xxx
2. Page shows "Sign In" button with redirect=/join?token=xxx
3. User clicks "Login with Google"
4. Google OAuth completes
5. App redirects to /setup (new user has no profile)
6. Token LOST - user cannot join family
```

The `redirect` parameter passed to `/login` was not being preserved through the OAuth flow for new users who need to complete `/setup` first.

---

## Options Considered

| Option | Effort | Lines | Pros | Cons |
|--------|--------|-------|------|------|
| **localStorage bridge** | 10 min | ~20 | Simple, works for all auth methods | Same-browser only |
| OAuth state parameter | 30 min | ~50 | Standard OAuth pattern | Requires OAuth flow changes |
| Server cookie | 20 min | ~30 | Server-side, robust | More complexity |
| SecureOAuthTransfer pattern | 25 min | ~40 | Existing pattern in codebase | Over-engineering for non-sensitive token |

---

## Decision

**Use localStorage bridge** - Store invite token in localStorage before OAuth, check on landing pages after auth.

### Why localStorage Over Other Options

1. **80/20 Principle**: 20 lines solves 99% of cases (same browser/device)
2. **Auth-method agnostic**: Works for Google, Facebook, email magic link, phone OTP
3. **No OAuth changes needed**: Doesn't require modifying sensitive auth flows
4. **Existing pattern**: Similar to `oauth-fragment-handler.js` approach

### Why Not SecureOAuthTransfer Pattern

The existing `SecureOAuthTransfer.ts` service uses sessionStorage with transfer IDs for sensitive OAuth data. While robust, it's over-engineering for invite tokens which are:
- Already exposed in URLs (by design)
- Not sensitive (40-char random, 7-day expiry, single-use)
- Server-validated before any action

---

## Implementation

### Files Modified

| File | Change |
|------|--------|
| `routes/join.tsx` | Store token in localStorage before showing login buttons |
| `routes/setup.tsx` | Check for pending token, redirect if found |
| `routes/index.tsx` | Fallback check for existing users who bypass /setup |

### Code Pattern

```javascript
// Store (in /join before OAuth)
localStorage.setItem('pendingInviteToken', token);

// Retrieve and redirect (in /setup and / pages)
(function() {
  var token = localStorage.getItem('pendingInviteToken');
  if (token) {
    localStorage.removeItem('pendingInviteToken');
    window.location.href = '/join?token=' + token;
  }
})();
```

### Fixed Flow

```
1. User clicks: /join?token=xxx
2. Token stored in localStorage
3. User clicks "Login with Google"
4. Google OAuth completes
5. New user → /setup → script finds token → redirect to /join?token=xxx
   Existing user → / → script finds token → redirect to /join?token=xxx
6. /join validates token, accepts invite
7. User joins family successfully
```

---

## Coverage

| Auth Method | New User | Existing User |
|-------------|----------|---------------|
| Google OAuth | ✅ via /setup | ✅ via / fallback |
| Facebook OAuth | ✅ via /setup | ✅ via / fallback |
| Email magic link | ✅ via /setup | ✅ via / fallback |
| Phone OTP | ✅ via /setup | ✅ via / fallback |

---

## Limitations (Acceptable)

1. **Same browser required**: Token won't transfer if user opens invite on phone but logs in on desktop
2. **localStorage disabled**: Rare edge case, user would need to re-click invite link
3. **Private browsing**: Some browsers clear localStorage, same workaround applies

These limitations affect <1% of users and have a simple workaround (re-click invite link).

---

## Alternatives Not Chosen

### OAuth State Parameter
Would require modifying `SocialAuthButtons.tsx` and OAuth callback handling. More invasive for marginal benefit.

### Server-side Cookie
Would require modifying route handlers to set/read cookies. Adds server complexity.

### SecureOAuthTransfer Pattern
Existing service for sensitive OAuth data. Over-engineering since invite tokens aren't sensitive.

---

## UX Enhancements (Jan 28, 2026)

Additional improvements to make the invite flow more robust and user-friendly:

### P1: Phone Login Redirect Fix (~3 lines)

**Problem**: Phone OTP login hardcoded redirect to `/` instead of respecting `redirect` parameter.

**Fix** (`routes/login.tsx`):
```typescript
// Before: return createSessionResponse(req, sessionData.session, "/", phone);
const redirectTo = url.searchParams.get("redirect") || "/";
return createSessionResponse(req, sessionData.session, redirectTo, phone);
```

**Benefit**: Direct redirect to `/join?token=xxx` without localStorage bridge hop.

### P2: Token Paste Recovery (~65 lines)

**Problem**: User with invalid/expired token has no recovery path.

**Fix** (`routes/join.tsx`): Added collapsible "Have an invite code?" section on error page.

```
┌─────────────────────────────────────┐
│  📋 Have an invite code?            │
│  ┌─────────────────────────────┐   │
│  │ Paste code from email...    │   │
│  └─────────────────────────────┘   │
│  [Apply Code]                       │
└─────────────────────────────────────┘
```

**Benefit**: Recovery for users who lost original link or have expired tokens.

### P3: Invite Context Banner (~50 lines)

**Problem**: User doesn't know if invite context is preserved during login.

**Fix** (`routes/login.tsx`): Show "Joining [Family Name]" banner when redirect contains invite token.

```
┌─────────────────────────────────────┐
│ 🎉 Joining Smith Family             │
│    Invited by Mom                   │
└─────────────────────────────────────┘
```

**Features**:
- Fetches family name server-side from invite token
- Persists across auth mode switches (Email/Phone/Social)
- Shows inviter name when available

**Benefit**: User confidence that invite context is preserved.

---

## Related Documents

- [Family Member Invites Milestone](../milestones/20260127_family_member_invites.md)
- [Architecture - Auth Flow](../architecture.md)
- [SecureOAuthTransfer.ts](../../lib/auth/SecureOAuthTransfer.ts) - Pattern reference

---

**Decision Made By**: Development Team
**Implementation**: January 28, 2026
**UX Enhancements**: January 28, 2026
