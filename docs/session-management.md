# Session Management Guide

**ChoreGami 2026 Session Architecture**  
**Last Updated**: January 10, 2026

## Overview

ChoreGami 2026 implements a sophisticated session management system that enables multiple family members to use the same browser without conflicts while maintaining security and user experience.

## Core Concepts

### 1. Multi-Layer Session Architecture

#### Browser Session Identity
- **sessionStorage**: `browser_session_id` - Unique identifier per browser tab
- **localStorage**: `active_profile_session_${sessionId}` - User context per tab
- **Server Session**: JWT-based parent authentication (family-wide)

#### Session Flow
```
1. Parent Authentication (JWT) → Family Access
2. Member Selection → Browser Session Creation  
3. Active Profile Storage → Tab-Specific Context
4. Dashboard Access → Role-Based Interface
```

### 2. Session Isolation Strategy

#### Problem Solved
```
❌ BEFORE: Dad selects himself → Mom selects herself → Dad's session overwritten
✅ AFTER:  Dad (Tab 1) and Mom (Tab 2) maintain independent sessions
```

#### Implementation
```typescript
// Each browser tab gets unique session ID
sessionStorage: browser_session_id = "session_1705123456789_abc123def"

// Profile context stored per session
localStorage: active_profile_session_session_1705123456789_abc123def = {
  "profileId": "dad-uuid",
  "profileName": "Dad", 
  "activatedAt": 1705123456789,
  "sessionId": "session_1705123456789_abc123def"
}
```

## Session Management API

### ActiveKidSessionManager Service

#### Core Methods
```typescript
export class ActiveKidSessionManager {
  // Set active profile for current browser session
  static setActiveKid(profileId: string, profileName: string): void

  // Get active profile ID for current browser session  
  static getActiveKidId(): string | null

  // Get full session information
  static getActiveKidSession(): SessionInfo | null

  // Clear session for current browser tab
  static clearActiveKid(): void

  // Check if active session exists
  static hasActiveKid(): boolean
}
```

#### Session Creation
```typescript
// When family member is selected (KidSelector.tsx)
const handleMemberSelect = async (member: FamilyMember) => {
  // Create browser-specific session
  ActiveKidSessionManager.setActiveKid(member.id, member.name);
  
  // Route based on role
  if (member.role === "parent") {
    window.location.href = "/parent/my-chores";
  } else {
    window.location.href = "/kid/dashboard";  
  }
};
```

#### Session Resolution
```typescript
// Client-side dashboard components (SecureKidDashboard, SecureParentDashboard)
const loadActiveUser = async () => {
  // Read from session storage
  const activeUserId = ActiveKidSessionManager.getActiveKidId();
  
  if (!activeUserId) {
    window.location.href = "/"; // Back to family selector
    return;
  }

  // Validate user belongs to authenticated family
  const user = familyMembers.find(member => member.id === activeUserId);
  if (!user) {
    ActiveKidSessionManager.clearActiveKid();
    window.location.href = "/";
    return;
  }

  // Load user-specific data
  setActiveUser(user);
  await loadUserData(activeUserId);
};
```

## Security Model

### 1. Session Boundaries

#### Family Authentication (Server-Side)
```typescript
// Every route validates family access
export const handler: Handlers = {
  async GET(req, ctx) {
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" }});
    }
    // Family context established
  }
};
```

#### Profile Session (Client-Side)
```typescript
// Components validate profile belongs to family  
const validateProfileSession = (profileId: string, familyMembers: FamilyMember[]) => {
  const profile = familyMembers.find(m => m.id === profileId);
  if (!profile) {
    ActiveKidSessionManager.clearActiveKid();
    window.location.href = "/";
    return false;
  }
  return true;
};
```

### 2. URL Security (No GUID Exposure)

#### Before (Insecure)
```
❌ /kid/2a807f2c-8885-4bb8-aa85-9f2dfed454d9/dashboard
❌ /parent/8b92ef1d-9996-4cc9-bb96-1c3eae645f0a/chores
```

#### After (Secure)  
```
✅ /kid/dashboard
✅ /parent/my-chores
✅ /parent/dashboard
```

#### Session-Based Routing Pattern
```typescript
// routes/kid/dashboard.tsx (No kid_id parameter)
export const handler: Handlers<SecureKidDashboardData> = {
  async GET(req, ctx) {
    // Server provides family context only
    const parentSession = await getAuthenticatedSession(req);
    return ctx.render({
      family: parentSession.family,
      familyMembers: await choreService.getFamilyMembers(familyId),
      // Client resolves active kid from session
    });
  },
};

// Client-side component reads session
export default function SecureKidDashboard({ family, familyMembers }) {
  useEffect(() => {
    // Read active kid from localStorage (session-specific)
    const activeKidId = ActiveKidSessionManager.getActiveKidId();
    loadKidData(activeKidId);
  }, []);
}
```

## Multi-User Browser Support

### Concurrent Family Member Usage

#### Scenario: Parents Using Same Computer
```
Tab 1: Dad selects "Dad" → sessionStorage: browser_session_id_1
                       → localStorage: active_profile_session_session_1 = Dad

Tab 2: Mom selects "Mom" → sessionStorage: browser_session_id_2  
                       → localStorage: active_profile_session_session_2 = Mom

Tab 3: Kid selects "Emma" → sessionStorage: browser_session_id_3
                        → localStorage: active_profile_session_session_3 = Emma

Result: All three tabs work independently with no conflicts
```

#### Session Storage Keys
```typescript
// Browser Tab 1 (Dad)
sessionStorage.browser_session_id = "session_1705123456_abc123"
localStorage.active_profile_session_session_1705123456_abc123 = {
  profileId: "dad-uuid",
  profileName: "Dad",
  sessionId: "session_1705123456_abc123"
}

// Browser Tab 2 (Mom) - Independent storage
sessionStorage.browser_session_id = "session_1705123500_def456" 
localStorage.active_profile_session_session_1705123500_def456 = {
  profileId: "mom-uuid", 
  profileName: "Mom",
  sessionId: "session_1705123500_def456"
}
```

## Session Lifecycle

### 1. Session Creation Flow
```
1. Parent Login (OAuth/Email/Phone) → JWT cookie set
2. Family Member Selector → KidSelector.tsx loaded
3. Member Selection → ActiveKidSessionManager.setActiveKid()
4. Browser Session ID → Generated and stored in sessionStorage
5. Profile Context → Stored in localStorage with session key
6. Dashboard Redirect → Role-based routing to appropriate view
```

### 2. Session Persistence
```
- **sessionStorage**: Tab-specific, cleared when tab closed
- **localStorage**: Persists across tab refresh, cleared on logout
- **Server Session**: JWT cookie, expires based on auth provider
- **Cross-Device**: Independent sessions per device/browser
```

### 3. Session Cleanup
```typescript
// Manual logout (logout.ts)
export const handler: Handlers = {
  async GET(req, ctx) {
    // Clear server session
    const response = new Response(null, { 
      status: 303, 
      headers: { Location: "/login" }
    });
    
    // Clear JWT cookie
    setCookie(response.headers, {
      name: "auth_session",
      value: "",
      expires: new Date(0)
    });
    
    // Client clears localStorage on redirect
    return response;
  }
};

// Client-side cleanup (automatic on logout page load)
useEffect(() => {
  ActiveKidSessionManager.clearActiveKid();
  window.location.href = "/login";
}, []);
```

## Session Validation Patterns

### 1. Client-Side Validation
```typescript
// SecureKidDashboard.tsx, SecureParentDashboard.tsx
const validateSession = async () => {
  try {
    const activeUserId = ActiveKidSessionManager.getActiveKidId();
    
    if (!activeUserId) {
      // No session - redirect to selector
      window.location.href = "/";
      return false;
    }

    const user = familyMembers.find(member => member.id === activeUserId);
    if (!user) {
      // Invalid session - clear and redirect
      ActiveKidSessionManager.clearActiveKid();
      window.location.href = "/";
      return false;  
    }

    return true;
  } catch (error) {
    console.error("Session validation failed:", error);
    ActiveKidSessionManager.clearActiveKid();
    window.location.href = "/";
    return false;
  }
};
```

### 2. Server-Side API Validation
```typescript
// api/kids/chores.ts - Profile validation via request body
export const handler: Handlers = {
  async POST(req, ctx) {
    // 1. Validate parent session (family access)
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Validate profile belongs to family
    const { kidId } = await req.json();
    const choreService = new ChoreService();
    const kid = await choreService.getFamilyMember(kidId);
    
    if (!kid || kid.family_id !== parentSession.family.id) {
      return new Response("Invalid family member", { status: 400 });
    }

    // 3. Return profile-specific data
    const chores = await choreService.getTodaysChores(kidId, parentSession.family.id);
    return Response.json(chores);
  }
};
```

## Troubleshooting

### Common Session Issues

#### 1. "No active session found"
**Symptoms**: User redirected to family selector unexpectedly
**Causes**: 
- Session storage cleared (browser cleanup)
- localStorage corruption
- Invalid profile ID in session

**Solutions**:
```typescript
// Check session storage
console.log("Session ID:", sessionStorage.getItem("browser_session_id"));
console.log("Active Profile:", ActiveKidSessionManager.getActiveKidSession());

// Clear and restart
ActiveKidSessionManager.clearActiveKid();
window.location.href = "/";
```

#### 2. Session conflicts between family members
**Symptoms**: Wrong family member's data appears
**Causes**:
- Shared browser_session_id (shouldn't happen with current implementation)
- localStorage key collision

**Solutions**:
```typescript
// Verify unique session IDs
console.log("Current sessions:", Object.keys(localStorage)
  .filter(key => key.startsWith("active_profile_session_")));

// Force new session creation
sessionStorage.removeItem("browser_session_id");
ActiveKidSessionManager.clearActiveKid();
```

#### 3. Parent authentication expired
**Symptoms**: Redirect to login despite valid profile session
**Causes**:
- JWT cookie expired
- Server session invalidated

**Solutions**:
```typescript
// Check auth status in network tab
fetch('/api/auth/status')
  .then(r => r.json())
  .then(status => console.log("Auth status:", status));

// Re-authenticate
window.location.href = "/login";
```

### Session Debugging

#### Development Tools
```typescript
// Session debugging helper (development only)
const debugSession = () => {
  console.log("=== SESSION DEBUG ===");
  console.log("Browser Session ID:", sessionStorage.getItem("browser_session_id"));
  console.log("Active Profile:", ActiveKidSessionManager.getActiveKidSession());
  console.log("All Sessions:", Object.keys(localStorage)
    .filter(key => key.startsWith("active_profile_session_"))
    .map(key => ({ key, value: JSON.parse(localStorage.getItem(key)) }))
  );
  console.log("=====================");
};

// Call in browser console: debugSession()
```

#### Session Cleanup Utility
```typescript
// Clean all sessions (development/testing)
const clearAllSessions = () => {
  Object.keys(localStorage)
    .filter(key => key.startsWith("active_profile_session_"))
    .forEach(key => localStorage.removeItem(key));
  
  sessionStorage.removeItem("browser_session_id");
  
  console.log("All sessions cleared");
};
```

## Best Practices

### 1. Component Session Handling
```typescript
// Always validate session in useEffect
useEffect(() => {
  const validateAndLoadSession = async () => {
    const activeUserId = ActiveKidSessionManager.getActiveKidId();
    
    if (!activeUserId) {
      window.location.href = "/";
      return;
    }
    
    // Validate belongs to family
    const user = familyMembers.find(m => m.id === activeUserId);
    if (!user) {
      ActiveKidSessionManager.clearActiveKid();
      window.location.href = "/";
      return; 
    }
    
    // Load user data
    setActiveUser(user);
    await loadUserData(activeUserId);
  };
  
  validateAndLoadSession();
}, [familyMembers]);
```

### 2. Error Handling
```typescript
// Graceful session error handling
const handleSessionError = (error: Error) => {
  console.error("Session error:", error);
  
  // Clear potentially corrupted session
  ActiveKidSessionManager.clearActiveKid();
  
  // Show user-friendly message before redirect
  alert("Session expired. Please select a family member again.");
  
  // Redirect to family selector
  window.location.href = "/";
};
```

### 3. Session Performance
```typescript
// Cache family member data to avoid repeated lookups
const [familyMemberMap, setFamilyMemberMap] = useState(new Map());

useEffect(() => {
  const memberMap = new Map(familyMembers.map(m => [m.id, m]));
  setFamilyMemberMap(memberMap);
}, [familyMembers]);

// Fast session validation
const validateActiveUser = (activeUserId: string) => {
  return familyMemberMap.has(activeUserId);
};
```

## Related Documentation

- [Signup & PIN Detection Fixes](./milestones/20260119_signup_and_pin_fixes.md) - Fixed `has_pin` vs `pin_hash` session property usage
- [Parent PIN Security Implementation](./20260111_parent_pin_security_implementation.md) - PIN protection architecture

---

**Session Management Status**: ✅ Production Ready
**Multi-User Browser Support**: ✅ Tested and Validated
**Security Model**: ✅ Comprehensive
**Documentation Coverage**: ✅ Complete
**Last Updated**: January 19, 2026