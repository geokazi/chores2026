# Cache Strategy: Session-Based Family Data Optimization

**Date**: January 14, 2026
**Status**: ✅ Implemented

## Problem Statement

Multiple routes were querying the same family data on every page load:
- `getFamily()` - called 5+ times per session
- `getFamilyMembers()` - called 5+ times per session
- `getFamilySettings()` - redundant with getFamily()

This resulted in 4-7 database queries per page load when 0-1 would suffice.

---

## Approaches Analyzed

We reviewed three existing cache implementations from sibling repositories:

### 1. userCache.ts (fresh-auth)
**Location**: `/Users/georgekariuki/repos/deno2/fresh-auth/utils/userCache.ts`

| Attribute | Value |
|-----------|-------|
| Storage | localStorage |
| TTL | 24 hours |
| Scope | Client-side only |
| Use Case | User display name, userId, email |

**Pattern**:
```typescript
class UserCache {
  get(): CachedUserData | null {
    const cached = localStorage.getItem(this.config.cacheKey);
    if (cacheAge > maxAge) { this.clear(); return null; }
    return userData;
  }
  set(displayName, userId, email): void {
    localStorage.setItem(this.config.cacheKey, JSON.stringify(userData));
  }
}
```

**Pros**:
- Simple key-value storage
- 24-hour expiry with automatic cleanup
- SSR-safe localStorage usage

**Cons**:
- Client-side only (not readable by server routes)
- Requires API call to populate on first load
- Not suitable for server-rendered pages

---

### 2. familyContext.ts (fresh-auth)
**Location**: `/Users/georgekariuki/repos/deno2/fresh-auth/utils/familyContext.ts`

| Attribute | Value |
|-----------|-------|
| Storage | Cookie + localStorage (dual) |
| TTL | 30 minutes |
| Scope | Server + Client |
| Use Case | familyId, parentProfileId, profileRole |

**Pattern**:
```typescript
// Dual storage: Cookie for server, localStorage for client
function cacheFamilyContext(context, response): string {
  const encoded = btoa(JSON.stringify(context));

  // Server-side cookie
  response.headers.set("Set-Cookie", `fCtx=${encoded}; HttpOnly; Secure; Max-Age=1800`);

  // Client-side localStorage
  localStorage.setItem("fCtx", encoded);

  return encoded;
}

function getCachedFamilyContext(request): FamilyContext | null {
  // Try cookie first (server-side)
  if (request) {
    const contextCookie = cookies.find(c => c.startsWith("fCtx="));
    if (contextCookie) return decodeFamilyContext(contextCookie);
  }
  // Fallback to localStorage (client-side)
  return decodeFamilyContext(localStorage.getItem("fCtx"));
}
```

**Pros**:
- Works on both server and client
- 30-minute TTL aligned with auth session
- Base64 encoding for obfuscation
- HttpOnly cookie for security

**Cons**:
- Adds another cookie to manage
- Manual invalidation required
- Separate from main auth session

---

### 3. cache-manager.ts (choregami-mealplanner)
**Location**: `/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/lib/performance/cache-manager.ts`

| Attribute | Value |
|-----------|-------|
| Storage | In-memory Map |
| TTL | Configurable per entry (default 5 min) |
| Scope | Server-side only |
| Use Case | Generic key-value cache |

**Pattern**:
```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
}

// Auto-cleanup every 10 minutes
setInterval(() => cacheManager.cleanup(), 10 * 60 * 1000);
```

**Pros**:
- Generic, reusable for any data type
- Configurable TTL per entry
- Auto-cleanup of expired entries
- Fast in-memory access

**Cons**:
- Server-side only (lost on restart/deploy)
- Not shared across server instances
- Memory overhead for large datasets

---

## Analysis Summary

| Implementation | Storage | TTL | Best For |
|----------------|---------|-----|----------|
| `userCache.ts` | localStorage | 24h | Client-only user data |
| `familyContext.ts` | Cookie + localStorage | 30min | **Server + client family data** |
| `cache-manager.ts` | In-memory Map | Configurable | Server-side generic cache |

---

## Decision: Extend Existing Session

**Winner Pattern**: `familyContext.ts` (Cookie-based, server-readable, 30-min TTL)

**However**, our `session.ts` already implements cookie-based authentication with the `sb-access-token`. Rather than adding a separate caching layer, we chose to **extend the existing session** to include all family data.

### Rationale

1. **Single Source of Truth**: One session object contains all auth + family data
2. **No Extra Cookies**: Reuses existing auth flow without new cookies
3. **Automatic Invalidation**: Session refreshes on re-authentication
4. **Simpler Architecture**: No separate cache to manage or invalidate
5. **Parallel Queries**: Batch fetch family + members in `getAuthenticatedSession()`

---

## Implementation

### Before: session.ts
```typescript
export interface ChoreGamiSession {
  user: { id, email, role } | null;
  family: { id, name, points_per_dollar } | null;
  isAuthenticated: boolean;
}

// Queries: 1 (user) + 1 (profile) + 1 (family) = 3 queries
```

### After: session.ts
```typescript
export interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
}

export interface ChoreGamiSession {
  user: {
    id: string;
    email: string;
    role?: string;
    profileId?: string;      // NEW: Logged-in user's profile ID
    profileName?: string;    // NEW: Logged-in user's profile name
  } | null;
  family: {
    id: string;
    name: string;
    points_per_dollar: number;
    children_pins_enabled: boolean;  // NEW: PIN toggle setting
    theme: string;                    // NEW: Family theme
    members: FamilyMember[];          // NEW: All family members
  } | null;
  isAuthenticated: boolean;
}

// Queries: 1 (user) + 1 (profile) + 2 (family + members in parallel) = 3-4 queries
// But now routes don't need additional queries!
```

### Batch Fetch Pattern
```typescript
// Parallel fetch in getAuthenticatedSession()
const [familyResult, membersResult] = await Promise.all([
  supabase.from("families")
    .select("id, name, points_per_dollar, children_pins_enabled, theme")
    .eq("id", profileData.family_id)
    .single(),
  supabase.from("family_profiles")
    .select("id, name, role, current_points")
    .eq("family_id", profileData.family_id)
    .eq("is_deleted", false)
    .order("current_points", { ascending: false }),
]);
```

---

## Query Reduction by Route

| Route | Before | After | Savings |
|-------|--------|-------|---------|
| `/` (kid selector) | 4 queries | 3 queries | -25% |
| `/kid/dashboard` | 5 queries | 4 queries | -20% |
| `/parent/dashboard` | 7 queries | 6 queries | -14% |
| `/parent/settings` | 5 queries | 3 queries | -40% |
| `/reports` | 5 queries | 5 queries | 0% (new route) |

**Total session savings**: ~20-40% fewer DB queries per page load

---

## Cache Invalidation Strategy

Since we extended the session rather than adding a separate cache:

| Scenario | Invalidation Method |
|----------|---------------------|
| Settings changed (PIN, theme) | Redirect to `/login` to force re-auth |
| Member added/deleted | Page refresh (re-fetches session) |
| Points updated | Real-time via WebSocket (doesn't affect session cache) |
| User logs out | Session cleared automatically |

**Trade-off**: Settings changes require re-authentication to take effect. This is acceptable because:
1. Settings changes are rare (once per family setup)
2. Re-auth provides a clean session state
3. No stale cache issues

---

## Future Considerations

If more aggressive caching is needed:

1. **Add `familyContext.ts` pattern** for frequently-changing data
2. **Use `cache-manager.ts`** for server-side computed values
3. **Implement WebSocket cache invalidation** for real-time updates

**Current approach is sufficient** for the 20% effort → 80% value philosophy.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/auth/session.ts` | Extended session interface + parallel queries |
| `routes/index.tsx` | Use cached `session.family.members` |
| `routes/kid/dashboard.tsx` | Use cached family data |
| `routes/parent/dashboard.tsx` | Use cached family + members |
| `routes/parent/settings.tsx` | Use cached settings |

---

## References

- `userCache.ts`: `/Users/georgekariuki/repos/deno2/fresh-auth/utils/userCache.ts`
- `familyContext.ts`: `/Users/georgekariuki/repos/deno2/fresh-auth/utils/familyContext.ts`
- `cache-manager.ts`: `/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/lib/performance/cache-manager.ts`
