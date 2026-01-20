# Signup Flow & Parent PIN Detection Fixes

**Document Created**: January 19, 2026
**Status**: ✅ **COMPLETE**
**Issues Fixed**: 4 critical bugs affecting new user onboarding

## Executive Summary

This session resolved four critical bugs that prevented new users from completing signup and properly setting up their parent PIN. All issues affected production on Fly.io but were not reproducible on localhost.

## Issues Fixed

### 1. Signup Flow Broken - Supabase Schema Config Error

**Severity**: 🔴 Critical (blocked all new user signups)

**Symptoms**:
- After entering username/password or phone OTP, users get error on `/setup` page
- Error: "Failed to create family: The schema must be one of the following: public, graphql_public, choretracker, analytics, familyscore"

**Root Cause**:
The `getServiceSupabaseClient()` in `lib/supabase.ts` had invalid `db.schema` configuration:
```typescript
// BROKEN: Supabase interprets this as ONE invalid schema name
db: {
  schema: "public,choretracker,analytics"
}
```

The Supabase JS client expects a **single schema name**, not a comma-separated list.

**Why Localhost Worked**:
- Both localhost and production use the same Supabase instance
- The client caching (`_serviceClient`) behaves differently with dev server restarts
- The exact code path wasn't tested locally after the schema config was added

**Why Other Routes Worked**:
- `getAuthenticatedSession()` in `lib/auth/session.ts` creates a client WITHOUT any `db.schema` config
- Only routes using `getServiceSupabaseClient()` were affected

**Solution**:
Removed the invalid `db.schema` configuration entirely. Services that need choretracker schema already use `.schema("choretracker")` explicitly in their queries.

**Files Modified**:
- `lib/supabase.ts` - Removed `db: { schema: "..." }` from service client config

**Commit**: `e045599 🐛 Fix Supabase schema config breaking signup`

---

### 2. First-Time PIN Setup UX - Wrong Modal State

**Severity**: 🟡 High (confusing UX for new users)

**Symptoms**:
- First-time users accessing `/parent/settings` see "Enter your PIN" instead of "Set Up Your PIN"
- After entering any 4 digits, shows "Incorrect PIN. Try again."
- Users don't understand they need to CREATE a PIN, not enter one

**Root Cause**:
`ParentPinGate` correctly detected `!parent.pin_hash` (no PIN set) but didn't pass this information to `ParentPinModal`. The modal only switched to setup mode AFTER the server responded with "No PIN set" error.

**Solution**:
1. Added `needsSetup` prop to `ParentPinModal`
2. `ParentPinGate` now tracks `needsSetup` state when `!parent.pin_hash`
3. Modal immediately shows "Set Up Your PIN" with appropriate messaging

**Files Modified**:
- `islands/ParentPinGate.tsx` - Added `needsSetup` state tracking and prop passing
- `islands/ParentPinModal.tsx` - Added `needsSetup` prop and appropriate header text

**Commit**: `e43a7b5 🐛 Fix first-time PIN setup UX for new users`

---

### 3. Settings Page Order - Family Members Buried

**Severity**: 🟢 Low (UX improvement for new users)

**Symptoms**:
- New users see "Free Plan" and "Chore Assignment Mode" first
- "Family Members" section (with "+ Add Kid") buried at bottom
- Users can't easily find how to add their kids

**Root Cause**:
Settings sections were ordered by "usage frequency" rather than "first-time user flow". Adding kids is the critical first action for new families.

**Solution**:
Reordered sections in `FamilySettings.tsx`:
1. **Family Members** - Add kids first (critical for first-time users)
2. Chore Rotation Templates - Core functionality (requires kids)
3. Point Management
4. Weekly Family Goal
5. App Theme
6. Kid PIN Security
7. Parent PIN Security

**Files Modified**:
- `islands/FamilySettings.tsx` - Reordered section rendering

**Commit**: `6bac73e ♻️ Reorder settings: Family Members first for new users`

---

### 4. PIN Detection After Logout/Login - Always Shows Setup

**Severity**: 🔴 Critical (returning users can't access settings)

**Symptoms**:
- User sets up PIN, logs out, logs back in
- Going to `/parent/settings` shows "Set Up Your PIN" again
- PIN was saved correctly but not detected

**Root Cause**:
Session security model converts `pin_hash` to boolean `has_pin` (to avoid exposing the actual hash to the client):
```typescript
// lib/auth/session.ts
members: (membersData || []).map((m: any) => ({
  ...
  has_pin: !!m.pin_hash,  // Convert to boolean - don't expose actual hash
}));
```

But `ParentPinGate` was checking `parent.pin_hash` which is always `undefined` on the client:
```typescript
// BROKEN: pin_hash is never sent to client
if (!parent.pin_hash) {
  setNeedsSetup(true);  // Always true!
}
```

**Solution**:
Updated `ParentPinGate` and `ParentPinModal` to check `has_pin` boolean instead:
```typescript
// FIXED: Check the boolean the session actually provides
const hasPin = parent.has_pin || !!parent.pin_hash;
if (!hasPin) {
  setNeedsSetup(true);
}
```

**Files Modified**:
- `islands/ParentPinGate.tsx` - Check `has_pin` instead of `pin_hash`
- `islands/ParentPinModal.tsx` - Updated interface and logging

**Commit**: `f936696 🐛 Fix PIN detection after logout/login`

---

## Technical Details

### Session Security Model

The session system intentionally hides sensitive data from the client:

| Server Data | Client Data | Reason |
|-------------|-------------|--------|
| `pin_hash` (bcrypt) | `has_pin` (boolean) | Don't expose actual hash |
| `user_id` | Not exposed | Server-only authentication |
| Full settings JSONB | Filtered subset | Minimize client data |

### Supabase Client Architecture

```
getSupabaseClient()           → Anon key, default schema (public)
getServiceSupabaseClient()    → Service role key, default schema (public)
ChoreService internal client  → Uses .schema("choretracker") explicitly
```

The fix ensures all clients use default 'public' schema, with explicit `.schema()` calls for other schemas.

## Testing Checklist

- [x] New user can complete signup flow
- [x] New user sees "Set Up Your PIN" on first settings access
- [x] Family Members section appears first in settings
- [x] Returning user (with PIN) sees "Enter your PIN" modal
- [x] PIN verification works correctly after logout/login
- [x] Existing users unaffected by changes

## Related Documentation

- [Session Management Guide](../session-management.md) - Multi-user browser session architecture
- [Parent PIN Security Implementation](../20260111_parent_pin_security_implementation.md) - PIN protection system
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Settings storage pattern

---

**Implementation Status**: ✅ **COMPLETE**
**Production Deployment**: ✅ **Verified on Fly.io**
**Commits**: 4 (e045599, e43a7b5, 6bac73e, f936696)

*Implementation completed by: Claude Code AI Assistant*
