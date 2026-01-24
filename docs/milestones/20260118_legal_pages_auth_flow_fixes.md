# Legal Pages & Auth Flow Fixes

**Date**: January 18, 2026
**Status**: ✅ Complete

## Overview

Updated legal pages (Terms of Service, Privacy Policy) with parent-friendly, legally compliant content and fixed critical phone OTP authentication flow issues.

## Changes Made

### 1. Terms of Service Update (`/terms`)

**File**: `routes/terms.tsx`

Completely rewrote Terms of Service with:
- **Plain English language**: Removed aggressive legal jargon
- **Prepaid/gift model alignment**: Clear sections on one-time purchases, gift codes, no auto-renewal
- **Trust-first approach**: Balanced protection without intimidating families
- **10 sections**: Acceptance, Service Description, Accounts, Payments/Gifts, Acceptable Use, Data, Warranties, Liability, Termination, Contact

### 2. Privacy Policy Update (`/privacy`)

**File**: `routes/privacy.tsx`

Completely rewrote Privacy Policy with COPPA awareness:
- **Explicit child data protections**: Clear "We do not collect" section for children (no email, phone, location, marketing data)
- **Gift code handling**: Transparent about gift code storage and usage
- **No targeted advertising**: Explicit callout that family/child data is never used for ads
- **Trust-forward tone**: Balanced legal compliance with parent-friendly language
- **11 sections**: Information Collection (with child-specific subsection), Usage, Sharing, Children's Privacy, Security, Rights, Retention, Cookies, International, Changes, Contact

### 3. Phone OTP Session Fix

**Files**: `routes/login.tsx`, `routes/register.tsx`

**Problem**: After phone OTP verification, users were redirected to `https://eat.choregami.app/` (wrong domain) instead of staying on the current application.

**Root Cause**: Supabase's `generateLink` magic link redirects through Supabase's server which uses the Site URL configured in the Supabase dashboard.

**Solution**: Extract token from magic link and verify directly via `verifyOtp` to create session locally:

```typescript
// Generate magic link to get session tokens (don't redirect through Supabase)
const { data: linkData } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: targetUser.email!,
});

if (linkData?.properties?.action_link) {
  const actionUrl = new URL(linkData.properties.action_link);
  const token = actionUrl.searchParams.get("token");
  const type = actionUrl.searchParams.get("type");

  if (token && type) {
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as "magiclink",
    });

    if (!verifyError && sessionData.session) {
      return createSessionResponse(req, sessionData.session, "/setup");
    }
  }
}
```

### 4. Route Path Corrections

**Files**:
- `islands/auth/PhoneAuthForm.tsx` (3 occurrences)
- `islands/auth/EmailAuthForm.tsx` (1 occurrence)
- `islands/auth/AuthPageLayout.tsx` (1 occurrence)
- `lib/auth/AuthenticationService.ts` (1 occurrence)

**Problem**: Components referenced `/signup` but actual route was `/register.tsx`, causing 404 errors.

**Solution**: Changed all `/signup` references to `/register` across 4 files.

## Files Modified

| File | Changes |
|------|---------|
| `routes/terms.tsx` | Complete rewrite - parent-friendly Terms of Service |
| `routes/privacy.tsx` | Complete rewrite - COPPA-aware Privacy Policy |
| `routes/login.tsx` | Phone OTP session fix + honeypot field |
| `routes/register.tsx` | Phone OTP session fix + honeypot field + welcome email logging |
| `islands/auth/PhoneAuthForm.tsx` | Route path fix (/signup → /register) |
| `islands/auth/EmailAuthForm.tsx` | Route path fix |
| `islands/auth/AuthPageLayout.tsx` | Route path fix |
| `lib/auth/AuthenticationService.ts` | Route path fix |
| `lib/services/email-service.ts` | Added logging for debugging |

## Security Improvements

- **Honeypot fields**: Added invisible form fields to detect bot submissions
- **Generic error messages**: Changed enumeration-revealing messages to generic ones
- **Session isolation**: Phone OTP now creates session locally instead of redirecting through external domain

## Testing Verification

```bash
# Test phone signup flow (should not redirect to external domain)
curl -X POST http://localhost:8001/register?mode=phone \
  -d "phone=+15551234567"

# Test login page loads correctly
curl -s http://localhost:8001/login | grep "ChoreGami"

# Test legal pages render
curl -s http://localhost:8001/terms | grep "Terms of Service"
curl -s http://localhost:8001/privacy | grep "Privacy Policy"
```

## Related Documentation

- [Authentication Security Hardening](./20260119_authentication_security_hardening.md) - Rate limiting and enumeration protection
- [OAuth Signup Redirect Fix](./20260123_oauth_signup_redirect_fix.md) - Fixed infinite redirect loop after Google OAuth (same pattern: client-side routing, avoid server-side redirect dependency)
- [CLAUDE.md](../../CLAUDE.md) - Project specifications

---

*Completed: January 18, 2026*
