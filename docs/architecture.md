# ChoreGami 2026 - Technical Architecture

**Version**: 1.2
**Last Updated**: January 27, 2026
**Status**: Production Ready

## System Overview

ChoreGami 2026 is a simplified, real-time family chore management system built with Deno Fresh, designed following the **20% effort for 80% value** principle. The architecture prioritizes simplicity, security, and real-time family engagement.

## Architecture Principles

### Core Design Philosophy
1. **Simplicity First** - Zero cognitive load interfaces
2. **20/80 Principle** - Maximum impact with minimal complexity  
3. **No Code Bloat** - Reuse existing patterns and components
4. **Security by Design** - No sensitive data in URLs, session-based routing
5. **Real-Time Focus** - Sub-second updates across all family devices
6. **Component Size Limits** - No file exceeds 500 lines

### Architectural Patterns
- **Islands Architecture** - Server-side rendering with selective hydration
- **Session-Based Security** - No GUIDs in URLs, browser session isolation
- **Client-Side State Management** - localStorage + sessionStorage for user context
- **WebSocket Proxy Pattern** - Server-side API key protection
- **Component Composition** - Single responsibility, reusable components

## Technology Stack

### Frontend
```typescript
// Framework & Runtime
Deno Fresh 2.0          // Server-side rendering with Islands
TypeScript (Strict)      // Full type safety, no-any enforcement  
Preact                   // React-compatible UI library

// Styling & UI
CSS Custom Properties    // Fresh Meadow theme system
Mobile-First Design      // Touch-optimized interfaces
Zero Framework CSS       // No UI library dependencies
```

### Backend
```typescript
// Server & API
Deno 2.0                // Modern JavaScript/TypeScript runtime
Fresh Framework         // File-based routing with API routes
WebSocket Proxy         // Real-time communication layer

// Database & Auth
Supabase PostgreSQL     // Production database (reused schema)
Multi-Provider OAuth    // Google, Meta, Email, Phone authentication
JWT Sessions            // Parent authentication tokens
```

### Real-Time Infrastructure
```typescript
// WebSocket Integration
FamilyScore API         // Phoenix Channels via WebSocket proxy
Real-Time Leaderboard   // Live family rankings and streak tracking
Activity Feed           // Instant chore completion notifications
Cross-Device Sync       // Changes appear on all family devices
```

## System Architecture

### High-Level Component Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Family User   │    │  Parent User     │    │   Admin User    │
│   (Kids)        │    │  (Mom/Dad)       │    │   (Setup)       │
└─────┬───────────┘    └────────┬─────────┘    └─────────────────┘
      │                         │                        │
      └─────────────────────────┼────────────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │  Deno Fresh App   │
                      │  (Server + Client)│
                      └─────────┬─────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│ Authentication │    │   Session       │    │  Real-Time      │
│ Service        │    │   Management    │    │  WebSocket      │
│ (Multi-OAuth)  │    │   (Browser Tab) │    │  Proxy          │
└────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │     Supabase           │
                    │   PostgreSQL DB        │
                    │ (choretracker schema)  │
                    └────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    FamilyScore API     │
                    │  (Phoenix Channels)    │
                    │   Point Tracking       │
                    └────────────────────────┘
```

### Application Flow
```
1. Parent Login (Multi-OAuth)
   ↓
2. Family Member Selection 
   ↓  
3. Session Storage (Browser Tab Specific)
   ↓
4. Role-Based Dashboard Routing
   ├─ Kids → /kid/dashboard (Chore Completion)
   └─ Parents → /parent/my-chores (Personal) + /parent/dashboard (Family)
   ↓
5. Real-Time Updates (WebSocket Proxy)
   ↓
6. FamilyScore Point Sync (Transaction Service)
```

## Data Architecture

### Database Schema (Supabase PostgreSQL)

#### Core Tables (Existing - Reused)
```sql
-- Family organization
public.families (
  id uuid PRIMARY KEY,
  name text,
  children_pins_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

public.family_profiles (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  name text,
  role text, -- 'parent' | 'child'
  current_points integer DEFAULT 0,
  pin_hash text, -- bcrypt hash for both parent and kid PINs
  user_id uuid, -- Only parents have user_id, kids are null
  created_at timestamptz DEFAULT now()
)

-- Chore management (choretracker schema)
choretracker.chore_templates (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  name text NOT NULL,
  description text,
  points integer NOT NULL DEFAULT 1,
  category text,
  icon text,
  created_at timestamptz DEFAULT now()
)

choretracker.chore_assignments (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  chore_template_id uuid REFERENCES chore_templates(id),
  assigned_to_profile_id uuid REFERENCES family_profiles(id),
  family_event_id uuid REFERENCES family_events(id) ON DELETE SET NULL, -- Event link for "missions"
  status text DEFAULT 'pending', -- 'pending' | 'completed' | 'verified'
  due_date timestamptz,
  point_value integer,
  assigned_date date DEFAULT CURRENT_DATE,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Family events (reused from MealPlanner)
choretracker.family_events (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  title text NOT NULL,
  event_date date NOT NULL,
  schedule_data jsonb, -- { all_day: boolean, start_time: string }
  participants uuid[], -- Profile IDs of participants
  metadata jsonb, -- { source_app: string, emoji: string }
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

choretracker.chore_transactions (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  profile_id uuid REFERENCES family_profiles(id),
  chore_assignment_id uuid REFERENCES chore_assignments(id),
  transaction_type text NOT NULL,
  points_change integer NOT NULL,
  balance_after_transaction integer NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
)
```

### Session Management Architecture

#### Browser Session Isolation
```typescript
// Each browser tab gets unique session ID
interface BrowserSession {
  sessionId: string;           // Generated: session_timestamp_randomId  
  activeProfileId: string;     // Currently selected family member
  profileName: string;         // Display name
  activatedAt: number;         // Session creation timestamp
}

// Storage Strategy
sessionStorage: browser_session_id     // Tab-specific session identifier
localStorage: active_profile_session_${sessionId} // User context per tab
```

#### Session Storage Pattern
```typescript
// Session Management Service
export class ActiveKidSessionManager {
  // Generate unique session ID per browser tab
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem("browser_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("browser_session_id", sessionId);
    }
    return sessionId;
  }

  // Store active profile with session isolation
  static setActiveKid(profileId: string, profileName: string): void {
    const sessionId = this.getSessionId();
    const session = { profileId, profileName, activatedAt: Date.now(), sessionId };
    localStorage.setItem(`active_profile_session_${sessionId}`, JSON.stringify(session));
  }
}
```

## Security Architecture

### Authentication Flow
```
1. Parent Login
   ├─ Email/Password → Server-side session creation
   ├─ Phone/SMS OTP → Twilio Verify → local token extraction
   └─ Social OAuth (Google/Meta) → Implicit flow with fragment handling
   ↓
2. OAuth Fragment Handling (Social only)
   ├─ Browser returns to /login#access_token=...&refresh_token=...
   ├─ oauth-fragment-handler.js parses tokens client-side
   ├─ Sets sb-access-token + sb-refresh-token cookies
   ├─ Stores user data in localStorage
   └─ Redirects to /setup (client-side routing, no server dependency)
   ↓
3. Profile Setup (new users) or Home Redirect (existing users)
   ├─ /setup: Creates family + parent profile → redirects to /
   └─ /setup: If profile exists → redirects to /
   ↓
4. JWT Session Active (httpOnly cookie)
   ↓
5. Family Context Loading
   ↓
6. Member Selection (Kids + Parents)
   ↓
7. Session Storage (Browser Tab Isolation)
   ↓
8. Role-Based Dashboard Access
```

### Family Member Invite Flow (Planned)
```
1. Existing Parent Initiates Invite
   ├─ Settings > Family Members > "Invite Adult"
   ├─ Choose channel: Email or Phone
   └─ Enter contact info + optional name
   ↓
2. Invite Created & Stored
   ├─ 40-char secure token generated
   ├─ Stored in families.settings JSONB (no new tables)
   └─ 7-day expiry set
   ↓
3. Invite Sent
   ├─ Email: Resend sends magic link
   └─ Phone: Twilio sends SMS with link
   ↓
4. Recipient Clicks Link → /join?token=xxx
   ├─ Token validated (not expired, not used)
   ├─ Family name and inviter shown
   └─ Login or Signup options presented
   ↓
5. After Auth → Auto-Join Family
   ├─ New family_profiles record created (role=parent)
   ├─ user_id linked to auth.users
   └─ Invite removed from JSONB
   ↓
6. Full Parent Access
   └─ Same permissions as account creator
```

**Key Design Decisions:**
- **JSONB storage**: `families.settings.apps.choregami.pending_invites[]`
- **Dual-channel**: Email (Resend) + Phone (Twilio) - both already configured
- **Self-managed tokens**: Supabase built-in only supports email; we need phone too
- **~200 lines**: Minimal code, follows 80/20 principle

**See**: [Family Member Invites Implementation](./milestones/20260127_family_member_invites.md)

### Security Layers

#### 1. URL Security (Complete GUID Elimination)
```typescript
// BEFORE (Critical Security Risk)
❌ /kid/2a807f2c-8885-4bb8-aa85-9f2dfed454d9/dashboard

// INTERMEDIATE (Still Vulnerable)
❌ /kid/dashboard?user=2a807f2c-8885-4bb8-aa85-9f2dfed454d9

// FINAL (Completely Secure)
✅ /kid/dashboard               # Pure session-based routing
✅ /kid/chore/[chore_id]       # NO user identification anywhere
✅ /parent/my-chores          # Cookie-based user context
✅ /parent/dashboard          # Zero user data in URL
```

#### 2. Session Isolation (Multi-User Browser Support)
```typescript
// Each browser tab maintains independent session
Tab 1: Dad selects himself → active_profile_session_session_abc123
Tab 2: Mom selects herself → active_profile_session_session_def456
Tab 3: Kid selects themselves → active_profile_session_session_ghi789

// No session conflicts, each tab works independently
```

#### 3. Cookie-Based Session Validation
```typescript
// Server reads active kid from secure cookie (NO URL parsing)
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Validate parent session
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" }});
    }
    
    // 2. Get active kid from cookie (NEVER from URL)
    const cookies = req.headers.get("cookie") || "";
    const sessionMatch = cookies.match(/active_kid_session=([^;]+)/);
    const sessionData = JSON.parse(decodeURIComponent(sessionMatch[1]));
    const activeKidId = sessionData.kidId;
    
    // 3. Validate kid belongs to authenticated family
    if (kid.family_id !== parentSession.family.id) {
      return new Response("Access denied", { status: 403 });
    }
  }
};
```

#### 4. Parent PIN Protection (Sensitive Operations)
```typescript
// Session elevation for dangerous operations with profile-switch clearing
export const withParentPin = (handler) => async (req, ctx) => {
  const parentSession = await getAuthenticatedSession(req);
  
  // Check if parent session is elevated (5-minute window)
  const elevatedUntil = sessionStorage.getItem('parent_elevated_until');
  if (!elevatedUntil || Date.now() > parseInt(elevatedUntil)) {
    return new Response('PIN required', { status: 403 });
  }
  
  return handler(req, ctx);
};

// Component-level PIN protection with instant verification
const ProtectedOperation = () => (
  <ParentPinGate operation="adjust family points" familyMembers={members}>
    <button onClick={adjustPoints}>⚡ Adjust Points</button>
  </ParentPinGate>
);

// Profile-switch security: Clear parent session when accessing kid profiles
const handleKidAccess = async () => {
  const { clearParentSessionOnKidAccess } = await import("./parent-session.ts");
  clearParentSessionOnKidAccess("switching to kid profile");
  // Proceed with kid access...
};

// CRITICAL: Cancel bypass prevention
const handlePinCancel = () => {
  // SECURITY: Never allow access after PIN cancel
  // Show warning message but keep PIN modal active
  setCancelAttempted(true);
  // setNeedsPin(false) is NOT called here to prevent bypass
};
```

#### 5. WebSocket Security (API Key Protection)
```typescript
// Client never sees FamilyScore API keys
// Server-side proxy pattern
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Verify user has access to this family
    const session = await getAuthenticatedSession(req);

    // 2. Upgrade client WebSocket connection
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // 3. Connect to FamilyScore with API key (server-side only)
    const familyScoreWs = new WebSocket(familyScoreUrl, {
      headers: { "X-API-Key": Deno.env.get("FAMILYSCORE_API_KEY") }
    });

    // 4. Proxy messages with validation
    familyScoreWs.onmessage = (event) => clientSocket.send(event.data);
    clientSocket.onmessage = (event) => familyScoreWs.send(event.data);
  }
};
```

#### 6. Rate Limiting & Bot Protection
```typescript
// Deno KV-based rate limiting middleware (routes/_middleware.ts)
const PROTECTED_ROUTES: Record<string, RateLimitKey> = {
  "/login": "login",           // 5 requests/minute
  "/register": "register",     // 3 requests/minute
  "/api/pin/verify": "pinVerify", // 5 requests/5 minutes
  "/api/parent/verify-pin": "pinVerify",
};

export async function handler(req: Request, ctx: FreshContext) {
  if (req.method !== "POST") return ctx.next();

  const ip = getClientIp(req);  // Handles x-forwarded-for, fly-client-ip
  const result = await checkRateLimit(ip, RATE_LIMITS[limitKey]);

  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { "Retry-After": String(retryAfter) }
    });
  }
}
```

**Security Layers**:
- **Enumeration Protection**: Generic error messages prevent email/phone discovery
- **Rate Limiting**: Deno KV-based per-IP throttling for auth routes
- **Honeypot Fields**: Hidden form fields detect automated bot submissions
- **See**: [Authentication Security Hardening](./milestones/20260119_authentication_security_hardening.md)

## Events Calendar Integration

### Event Mission Architecture

**Status**: ✅ Implemented (January 19, 2026)

ChoreGami supports linking chores to family events, displaying them as grouped "missions" on the kid dashboard. This enables preparation-focused task management for activities like sports practice, birthday parties, and school events.

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **Event Mission** | Chores linked to an event, displayed as a grouped section |
| **Points Hiding** | Event missions hide points (focus on preparation, not rewards) |
| **Unlinked Chores** | Regular chores displayed separately with points visible |
| **Points Mode** | Auto-detected: if any chore has points > 0, show points for unlinked |

#### Technical Components

```
lib/utils/household.ts           # Grouping and points utilities (~100 lines)
├── groupChoresByEvent()         # Groups chores by family_event_id
├── usePointsMode()              # Detects if family uses points
├── formatEventDate()            # Display formatting for events
└── formatTime()                 # 12-hour time formatting

islands/EventMissionGroup.tsx    # Mission display component (~180 lines)
islands/EventsList.tsx           # Parent events list (~200 lines)
islands/AddEventModal.tsx        # Event creation form (~300 lines)

routes/api/events.ts             # Events API (GET list, POST create)
routes/api/events/[id].ts        # Single event (GET, DELETE)
routes/parent/events.tsx         # Parent events page
```

#### Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  family_events  │    │ chore_assignments │   │  KidDashboard   │
│  (choretracker) │◄───│ .family_event_id  │───▶│ groupChoresByEvent│
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   EventsList    │                            │EventMissionGroup│
│ "This Week" +   │                            │ Grouped display │
│ "Upcoming"      │                            │ No points shown │
└─────────────────┘                            └─────────────────┘
```

#### Event-Chore Linking

```typescript
// When creating a chore, optionally link to an event
const result = await choreService.createChoreWithTemplate(
  name, description, points, assignedTo,
  familyId, createdById, dueDate, category,
  familyEventId  // Optional: links chore to event
);

// Kid dashboard groups chores by event
const groupedChores = groupChoresByEvent(todaysChores);
// Returns: { events: [{ event, chores }], unlinked: [] }
```

### Kid Event Creation (Planned)

**Status**: 📋 Planned

Kids (especially teens) can create their own events with parent visibility, gated by existing PIN system.

```
families.settings.apps.choregami.kids_can_create_events: boolean (default: false)
```

**Access Control:**
- Setting OFF: Parents only (current behavior)
- Setting ON + Kid PIN disabled: Kids create freely
- Setting ON + Kid PIN enabled: PIN required before creating

**See**:
- [Decision: Kid Event Creation](./decisions/20260120_kid_event_creation.md)
- [Implementation Details](./milestones/20260120_kid_event_creation.md)
- [Events Calendar Integration Plan](./planned/20260119_events_calendar_rev2.md)

---

## Monetization Architecture

### Template Gating & Gift Codes

**Status**: ✅ Implemented (January 19, 2026)

ChoreGami uses a prepaid time-pass model for monetizing advanced chore rotation templates. The system is built on the existing JSONB settings architecture with no new database columns required.

#### Plan Tiers

| Tier | Templates | Price |
|------|-----------|-------|
| **Free** | Manual, Daily Basics, Dynamic Daily Routines | $0 |
| **Family Plan** | All templates (Smart Rotation, Weekend Warrior, Large Family, Seasonal) | $19-$59 |

#### Technical Components

```
lib/plan-gate.ts              # Plan checking utilities (~55 lines)
├── getPlan()                 # Extract plan from JSONB settings
├── hasPaidPlan()             # Boolean check for paid status
├── canAccessTemplate()       # Template access control
└── calculateNewExpiry()      # Plan extension (additive, not replacement)

routes/api/gift/redeem.ts     # Redemption API (~100 lines)
routes/redeem.tsx             # Redemption page (~65 lines)
islands/RedeemForm.tsx        # Interactive form (~195 lines)
islands/TemplateSelector.tsx  # Template selection with gating (~450 lines)

sql/20260118_gift_codes.sql   # Gift code table + generation functions
```

#### Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gift Code     │    │  Redemption API  │    │  JSONB Settings │
│   GIFT-XXXX-... │───▶│  POST /api/gift  │───▶│  families.      │
│   (gift_codes)  │    │  /redeem         │    │  settings.apps. │
└─────────────────┘    └──────────────────┘    │  choregami.plan │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │ TemplateSelector│
                                                │ canAccessTemplate│
                                                │ 🔓 or 🔒 display │
                                                └─────────────────┘
```

#### Plan Storage (JSONB)

```jsonc
// families.settings
{
  "apps": {
    "choregami": {
      "plan": {
        "type": "school_year",      // 'school_year' | 'summer' | 'full_year'
        "expires_at": "2027-06-30", // ISO date
        "activated_at": "2026-09-01",
        "source": "gift",           // 'direct' | 'gift' | 'promo'
        "gift_code": "GIFT-ABCD-1234"
      }
    }
  }
}
```

#### Key Design Decisions

1. **JSONB over columns**: No ALTER TABLE migrations, flexible for future plan types
2. **Additive expiry**: Redeeming a code extends existing plans, doesn't replace
3. **Component extraction**: TemplateSelector (~450 lines) extracted from FamilySettings (~2400→1800 lines)
4. **Free templates**: Daily Basics + Dynamic Daily ensure core value is free

**See**: [Template Gating Implementation](./planned/20260118_template_gating_gift_codes.md)

---

## Component Architecture

### Islands Architecture (Client-Side Hydration)

#### Server-Side Components (Static HTML)
```typescript
// routes/kid/dashboard.tsx
export default function KidDashboardPage({ data }: PageProps<SecureKidDashboardData>) {
  return (
    <div class="container">
      {/* Server-rendered layout */}
      <SecureKidDashboard 
        family={data.family}
        familyMembers={data.familyMembers}
        recentActivity={data.recentActivity}
      />
    </div>
  );
}
```

#### Client-Side Islands (Interactive Components)
```typescript
// islands/SecureKidDashboard.tsx (Hydrated)
export default function SecureKidDashboard({ family, familyMembers, recentActivity }) {
  const [activeKid, setActiveKid] = useState(null);
  const [todaysChores, setTodaysChores] = useState([]);
  
  useEffect(() => {
    loadActiveKid(); // Client-side session reading
  }, []);
  
  // Interactive chore completion, real-time updates
}
```

### Component Hierarchy
```
App Layout
├── Authentication (OAuth Islands)
│   ├── AuthModeSelector.tsx
│   ├── EmailAuthForm.tsx  
│   ├── PhoneAuthForm.tsx
│   └── SocialAuthButtons.tsx
├── Family Selection
│   ├── KidSelector.tsx (Multi-role family member picker)
│   └── PinEntryModal.tsx (Conditional kid PIN entry)
├── Kid Experience
│   ├── SecureKidDashboard.tsx (Session-based kid identification)
│   ├── KidDashboard.tsx (Chore completion interface with event grouping)
│   ├── ChoreList.tsx (Checkbox completion pattern with showPoints prop)
│   ├── EventMissionGroup.tsx (Event-linked chores as "missions")
│   └── ChoreDetail.tsx (Individual chore view)
├── Parent Experience
│   ├── SecureParentDashboard.tsx (Personal parent chore view)
│   ├── ParentDashboard.tsx (Family management interface)
│   ├── AddChoreModal.tsx (Chore creation with optional event linking)
│   ├── ParentActivityTab.tsx (Point adjustment interface)
│   ├── EventsList.tsx (Family events with "This Week"/"Upcoming" sections)
│   └── AddEventModal.tsx (Simple event creation form)
├── Real-Time Features
│   ├── LiveLeaderboard.tsx (Family rankings with WebSocket)
│   ├── LiveActivityFeed.tsx (Recent completions feed)
│   └── WebSocketManager.tsx (Connection management)
├── Security Components
│   ├── ParentPinGate.tsx (PIN protection wrapper)
│   ├── ParentPinModal.tsx (Parent PIN verification)
│   └── PinEntryModal.tsx (Kid PIN authentication)
└── Shared Components
    ├── FamilySettings.tsx (PIN and family configuration)
    └── KidSessionValidator.tsx (Session validation utility)
```

### Component Design Patterns

#### 1. Secure Session-Based Pattern
```typescript
// Pattern used by SecureKidDashboard, SecureParentDashboard
const loadActiveUser = async () => {
  // 1. Read from session storage  
  const activeUserId = ActiveKidSessionManager.getActiveKidId();
  
  // 2. Validate user belongs to authenticated family
  const user = familyMembers.find(member => member.id === activeUserId);
  
  // 3. Redirect if invalid
  if (!user) {
    ActiveKidSessionManager.clearActiveKid();
    window.location.href = "/";
    return;
  }
  
  // 4. Load user-specific data via secure API
  await loadUserData(activeUserId);
};
```

#### 2. Consistent UX Pattern (Checkbox Completion)
```typescript
// Shared by KidDashboard and SecureParentDashboard
const CheckboxCompletion = ({ chore, onComplete }) => (
  <span
    onClick={() => chore.status === "pending" && onComplete(chore.id)}
    style={{
      fontSize: "1.5rem",
      color: chore.status === "completed" ? "var(--color-success)" : "var(--color-text)",
      cursor: chore.status === "pending" ? "pointer" : "default",
    }}
  >
    {chore.status === "completed" ? "✓" : "☐"}
  </span>
);
```

#### 3. Role-Based Routing Pattern
```typescript
// KidSelector.tsx - Family member selection with role routing
const handleMemberSelect = async (member) => {
  // Set active profile in session
  ActiveKidSessionManager.setActiveKid(member.id, member.name);
  
  // Route based on role
  if (member.role === "parent") {
    window.location.href = "/parent/my-chores"; // Personal parent view
  } else {
    window.location.href = "/kid/dashboard"; // Kid chore view
  }
};
```

## Real-Time Architecture

### WebSocket Integration Pattern (Production Architecture)

#### Shared Connection Manager (Client-Side)
```typescript
// islands/WebSocketManager.tsx - Single connection shared across all components
let globalWebSocket: WebSocket | null = null;
let globalFamilyId: string | null = null;
const subscribers: Set<(message: any) => void> = new Set();

export default function WebSocketManager({ familyId, onLeaderboardUpdate, onMessage, children }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      // Reuse existing connection for same family
      if (globalWebSocket && globalFamilyId === familyId && globalWebSocket.readyState === WebSocket.OPEN) {
        setIsConnected(true);
        return;
      }

      // Connect to server-side WebSocket proxy (never directly to FamilyScore)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/familyscore/live/${familyId}`);

      ws.onopen = () => {
        console.log("🔗 Shared WebSocket connected to FamilyScore");
        setIsConnected(true);
        globalWebSocket = ws;
        globalFamilyId = familyId;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Broadcast to all subscriber components
        subscribers.forEach(handler => handler(data));
      };

      ws.onclose = () => {
        console.log("❌ Shared WebSocket disconnected");
        setIsConnected(false);
        globalWebSocket = null;
        // Auto-reconnect
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();
    
    // Add this component's handlers as subscribers
    subscribers.add(onMessage);

    return () => {
      subscribers.delete(onMessage);
    };
  }, [familyId]);

  return <div data-websocket-connected={isConnected}>{children}</div>;
}
```

#### Server-Side Proxy Security (Production Implementation)
```typescript
// routes/api/familyscore/live/[family_id].ts - Working implementation
export const handler: Handlers = {
  async GET(req, ctx) {
    const familyId = ctx.params.family_id;
    
    // 1. Validate WebSocket upgrade request
    if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket upgrade request", { status: 426 });
    }

    // 2. Upgrade client to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.addEventListener("open", () => {
      console.log(`🔗 Client WebSocket opened for family ${familyId}`);
      
      // 3. Connect to FamilyScore Phoenix Channel with API key (server-side only)
      connectToFamilyScore(familyId, socket);
    });

    async function connectToFamilyScore(familyId: string, clientSocket: WebSocket) {
      const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");
      const familyScoreWsUrl = `wss://familyscore-poc.fly.dev/socket/websocket?vsn=1.0.0&token=${familyScoreApiKey}`;
      
      const familyScoreSocket = new WebSocket(familyScoreWsUrl);

      familyScoreSocket.addEventListener("open", () => {
        // Join family channel using Phoenix Channel protocol
        const joinMessage = {
          topic: `family:${familyId}`,
          event: "phx_join",
          payload: {},
          ref: Date.now().toString(),
        };
        familyScoreSocket.send(JSON.stringify(joinMessage));
      });

      familyScoreSocket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        
        if (data.event === "leaderboard_update") {
          // Transform and forward FamilyScore data to client
          const transformedData = {
            type: "leaderboard_update",
            familyId: familyId,
            leaderboard: data.payload.leaderboard || [],
            timestamp: new Date().toISOString(),
          };
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify(transformedData));
          }
        }
      });
    }

    return response;
  }
};
```

### Real-Time Features Implementation

#### 1. Shared WebSocket Manager (Production Pattern)
```typescript
// islands/WebSocketManager.tsx - Single shared connection for all components
let globalWebSocket: WebSocket | null = null;
const subscribers: Set<(message: any) => void> = new Set();

export default function WebSocketManager({ familyId, onLeaderboardUpdate, onMessage, children }) {
  useEffect(() => {
    // Connect to server-side WebSocket proxy (not directly to FamilyScore)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/familyscore/live/${familyId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Broadcast to all subscriber components
      subscribers.forEach(handler => handler(data));
    };
    
    globalWebSocket = ws;
  }, [familyId]);

  return <div data-websocket-connected={isConnected}>{children}</div>;
}
```

#### 2. Component Integration Pattern
```typescript
// Pattern used by KidSelector.tsx, ParentDashboard.tsx, SecureKidDashboard.tsx
export default function ComponentWithLiveUpdates({ family, familyMembers }) {
  const [liveMembers, setLiveMembers] = useState(familyMembers);
  const [wsConnected, setWsConnected] = useState(false);

  // Handle real-time leaderboard updates
  const handleLeaderboardUpdate = (leaderboard: any[]) => {
    setLiveMembers(current => 
      current.map(member => {
        const updated = leaderboard.find(p => p.user_id === member.id);
        return updated ? { ...member, current_points: updated.points } : member;
      })
    );
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === "leaderboard_update") {
      setWsConnected(true);
    } else if (message.type === "feature_disabled" || message.type === "fallback_mode") {
      setWsConnected(false);
    }
  };

  return (
    <WebSocketManager 
      familyId={family.id}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      onMessage={handleWebSocketMessage}
    >
      {/* Connection status indicator */}
      <div>{wsConnected ? "🎮 Live updates" : "📊 Static view"}</div>
      
      {/* Use liveMembers (with real-time updates) instead of familyMembers */}
      {liveMembers.map(member => (
        <div key={member.id}>
          {member.name}: {member.current_points} pts
        </div>
      ))}
    </WebSocketManager>
  );
}
```

## API Architecture

### Route Structure
```
routes/
├── index.tsx                     # Family member selection (post-login)
├── login.tsx                     # Multi-provider authentication
├── kid/
│   └── dashboard.tsx             # Secure session-based kid dashboard
├── parent/
│   ├── dashboard.tsx             # Family management dashboard
│   ├── my-chores.tsx            # Personal parent chore completion
│   ├── events.tsx               # Family events list page
│   └── settings.tsx             # Family settings and PIN management
└── api/
    ├── chores/
    │   ├── create.ts             # Create chore + assignment (atomic, supports event linking)
    │   └── [chore_id]/
    │       └── complete.ts       # Complete chore with transaction logging
    ├── events/
    │   ├── index.ts              # GET list, POST create events
    │   └── [id].ts              # GET single, DELETE event
    ├── kids/
    │   └── chores.ts            # Secure chore loading with event data (POST with kidId)
    ├── points/
    │   └── adjust.ts            # Manual point adjustments with audit trail
    ├── family/
    │   └── pin-setting.ts       # Toggle PIN requirements for family
    └── familyscore/
        └── live/
            └── [family_id].ts   # WebSocket proxy for real-time updates
```

### API Patterns

#### 1. Secure Session-Based Endpoints
```typescript
// api/kids/chores.ts - POST pattern prevents GUID exposure
export const handler: Handlers = {
  async POST(req, ctx) {
    // 1. Validate parent session
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse request body (no GUIDs in URL)
    const { kidId } = await req.json();

    // 3. Validate kid belongs to authenticated family
    const choreService = new ChoreService();
    const kid = await choreService.getFamilyMember(kidId);
    if (!kid || kid.family_id !== parentSession.family.id) {
      return new Response("Invalid family member", { status: 400 });
    }

    // 4. Return kid-specific chores
    const chores = await choreService.getTodaysChores(kidId, parentSession.family.id);
    return Response.json(chores);
  }
};
```

#### 2. Atomic Chore Creation Pattern  
```typescript
// api/chores/create.ts - Create template + assignment in single transaction
export const handler: Handlers = {
  async POST(req, ctx) {
    const choreService = new ChoreService();
    const choreData = await req.json();
    
    // Atomic operation: template creation + assignment
    const result = await choreService.createChoreWithTemplate({
      familyId: parentSession.family.id,
      name: choreData.name,
      description: choreData.description,
      points: choreData.points,
      assignedTo: choreData.assignedTo, // Can be parent or kid
      dueDate: choreData.dueDate
    });
    
    return Response.json(result);
  }
};
```

#### 3. Transaction Logging Pattern
```typescript
// api/chores/[chore_id]/complete.ts - Universal completion for kids and parents
export const handler: Handlers = {
  async POST(req, ctx) {
    const { chore_id } = ctx.params;
    const { kid_id, profile_id } = await req.json();
    
    // Accept either kid_id (kids) or profile_id (parents) 
    const userId = kid_id || profile_id;
    
    // Use production-tested TransactionService
    const transactionService = new TransactionService();
    
    // Atomic: chore completion + point tracking + FamilyScore sync
    const result = await transactionService.recordChoreCompletion(
      chore_id,
      pointValue,
      choreName,
      userId,
      user.family_id
    );
    
    return Response.json(result);
  }
};
```

## Performance Considerations

### Bundle Optimization
- **Islands Architecture**: Only interactive components hydrated on client
- **Minimal JavaScript**: Server-side rendering reduces client bundle size
- **CSS Custom Properties**: No CSS framework dependencies
- **Selective Hydration**: Components hydrate only when needed

### Database Performance
- **Reused Schema**: Leverages existing optimized choretracker tables  
- **Indexed Queries**: Family-based queries use existing family_id indexes
- **Connection Pooling**: Supabase handles connection management
- **Transaction Batching**: Atomic operations reduce round trips

### Real-Time Performance  
- **Shared WebSocket Connection**: Single connection per family shared across all components
- **Server-Side Proxy**: Client never connects directly to FamilyScore (security + performance)
- **Subscriber Pattern**: Efficient message broadcasting to multiple components
- **Auto-Reconnection**: Exponential backoff with maximum retry limits
- **Feature Flags**: Graceful degradation when FamilyScore unavailable
- **Connection Reuse**: Same family WebSocket reused across browser tabs
- **Message Filtering**: Only relevant family updates forwarded to clients

## Deployment Architecture

### Environment Configuration
```bash
# Production Environment Variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  
SUPABASE_ANON_KEY=your_anon_key

# FamilyScore Integration
FAMILYSCORE_API_KEY=your_api_key
FAMILYSCORE_BASE_URL=https://your-familyscore-instance.com
FAMILYSCORE_WEBSOCKET_URL=wss://your-familyscore-instance.com/socket

# Authentication Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
META_APP_ID=your_meta_app_id  
META_APP_SECRET=your_meta_secret

# SMS Authentication (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_sid

# Feature Flags
FAMILY_LEADERBOARD_ENABLED=true
DENO_ENV=production
```

### Deployment Targets
- **Primary**: Deno Deploy (serverless edge functions)
- **Alternative**: Docker containers on cloud providers  
- **Development**: Local Deno server with hot reload

## WebSocket Architecture Notes

### ✅ Production Implementation (Current)
- **Pattern**: Server-side WebSocket proxy with shared client connection
- **Security**: API keys never exposed to client, all connections server-validated
- **Performance**: Single shared connection per family, subscriber pattern for broadcasting
- **Reliability**: Auto-reconnection, graceful degradation, feature flags

### ❌ Anti-Pattern (Avoided)
- **Direct Client Connection**: Never connect directly from browser to FamilyScore
- **Multiple Connections**: Avoid one WebSocket per component (resource waste)
- **API Key Exposure**: Never send FamilyScore credentials to client-side

---

**Architecture Status**: ✅ Production Ready  
**Security Audit**: ✅ Complete  
**WebSocket Implementation**: ✅ Optimized & Secure  
**Performance Testing**: 🔄 Ongoing  
**Documentation Coverage**: ✅ Complete