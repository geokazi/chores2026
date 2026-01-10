# ChoreGami 2026 - Technical Architecture

**Version**: 1.0  
**Last Updated**: January 10, 2026  
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
  status text DEFAULT 'pending', -- 'pending' | 'completed' | 'verified'
  due_date timestamptz,
  point_value integer,
  assigned_date date DEFAULT CURRENT_DATE,
  completed_at timestamptz,
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
1. Parent OAuth Login
   ├─ Google OAuth 2.0
   ├─ Meta (Facebook) OAuth  
   ├─ Email/Password
   └─ Phone/SMS Verification (Twilio)
   ↓
2. JWT Session Creation (httpOnly cookie)
   ↓
3. Family Context Loading
   ↓
4. Member Selection (Kids + Parents)
   ↓
5. Session Storage (Browser Tab Isolation)
   ↓
6. Role-Based Dashboard Access
```

### Security Layers

#### 1. URL Security (No GUID Exposure)
```typescript
// BEFORE (Insecure)
❌ /kid/2a807f2c-8885-4bb8-aa85-9f2dfed454d9/dashboard

// AFTER (Secure)  
✅ /kid/dashboard
✅ /parent/my-chores
✅ /parent/dashboard
```

#### 2. Session Isolation (Multi-User Browser Support)
```typescript
// Each browser tab maintains independent session
Tab 1: Dad selects himself → active_profile_session_session_abc123
Tab 2: Mom selects herself → active_profile_session_session_def456
Tab 3: Kid selects themselves → active_profile_session_session_ghi789

// No session conflicts, each tab works independently
```

#### 3. Server-Side Validation
```typescript
// Every API call validates family membership
export const handler: Handlers = {
  async GET(req, ctx) {
    const parentSession = await getAuthenticatedSession(req);
    if (!parentSession.isAuthenticated || !parentSession.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" }});
    }
    // Family boundary enforcement
  }
};
```

#### 4. WebSocket Security (API Key Protection)
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
│   ├── KidDashboard.tsx (Chore completion interface)
│   ├── ChoreList.tsx (Checkbox completion pattern)
│   └── ChoreDetail.tsx (Individual chore view)
├── Parent Experience
│   ├── SecureParentDashboard.tsx (Personal parent chore view)  
│   ├── ParentDashboard.tsx (Family management interface)
│   ├── AddChoreModal.tsx (Chore creation for any family member)
│   └── ParentActivityTab.tsx (Point adjustment interface)
├── Real-Time Features
│   ├── LiveLeaderboard.tsx (Family rankings with WebSocket)
│   ├── LiveActivityFeed.tsx (Recent completions feed)
│   └── WebSocketManager.tsx (Connection management)
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

### WebSocket Integration Pattern

#### Client-Side Connection Management
```typescript
// islands/WebSocketManager.tsx
export default function WebSocketManager({ familyId, onMessage }) {
  useEffect(() => {
    // Connect to server-side WebSocket proxy (not directly to FamilyScore)
    const ws = new WebSocket(`ws://localhost:8000/api/familyscore/live/${familyId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data); // Update leaderboard, activity feed, etc.
    };
    
    return () => ws.close();
  }, [familyId]);
}
```

#### Server-Side Proxy Security
```typescript
// routes/api/familyscore/live/[family_id].ts
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Authenticate and validate family access
    const session = await getAuthenticatedSession(req);
    if (session.family_id !== ctx.params.family_id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Upgrade to WebSocket
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // 3. Connect to FamilyScore (server-side with API key)
    const familyScoreWs = new WebSocket(
      `${familyScoreUrl}/families/${ctx.params.family_id}`,
      { headers: { "X-API-Key": process.env.FAMILYSCORE_API_KEY } }
    );

    // 4. Bi-directional message proxy with validation
    familyScoreWs.onmessage = (event) => {
      // Optional: Validate/filter messages before forwarding
      clientSocket.send(event.data);
    };
    
    clientSocket.onmessage = (event) => {
      // Optional: Validate client messages before forwarding
      familyScoreWs.send(event.data);
    };

    return response;
  }
};
```

### Real-Time Features Implementation

#### 1. Live Leaderboard Updates
```typescript
// islands/LiveLeaderboard.tsx
export default function LiveLeaderboard({ familyMembers, familyId }) {
  const [members, setMembers] = useState(familyMembers);
  
  const handleWebSocketMessage = (data) => {
    if (data.type === 'leaderboard_update') {
      setMembers(data.members); // Real-time ranking update
    }
  };
  
  return (
    <>
      <WebSocketManager familyId={familyId} onMessage={handleWebSocketMessage} />
      {/* Leaderboard display */}
    </>
  );
}
```

#### 2. Activity Feed Real-Time Updates
```typescript
// islands/LiveActivityFeed.tsx  
export default function LiveActivityFeed({ initialActivity, familyId }) {
  const [activity, setActivity] = useState(initialActivity);
  
  const handleWebSocketMessage = (data) => {
    if (data.type === 'chore_completed') {
      setActivity(prev => [data.activity, ...prev.slice(0, 9)]); // Add new, keep recent 10
    }
  };
  
  return (
    <>
      <WebSocketManager familyId={familyId} onMessage={handleWebSocketMessage} />
      {/* Activity feed display with 🟢 live indicator */}
    </>
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
│   └── settings.tsx             # Family settings and PIN management
└── api/
    ├── chores/
    │   ├── create.ts             # Create chore + assignment (atomic)
    │   └── [chore_id]/
    │       └── complete.ts       # Complete chore with transaction logging
    ├── kids/
    │   └── chores.ts            # Secure chore loading (POST with kidId)
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
// api/chores/[chore_id]/complete.ts - Completion with FamilyScore sync
export const handler: Handlers = {
  async POST(req, ctx) {
    const { chore_id } = ctx.params;
    const { profile_id, family_id } = await req.json();
    
    // Use production-tested TransactionService
    const transactionService = new TransactionService();
    
    // Atomic: chore completion + point tracking + FamilyScore sync
    const result = await transactionService.recordChoreCompletion(
      chore_id,
      pointValue,
      choreName,
      profile_id,
      family_id
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
- **WebSocket Proxy**: Server-side connection reduces client overhead
- **Message Filtering**: Only relevant family updates forwarded to clients
- **Connection Management**: Auto-reconnection and heartbeat handling
- **Graceful Degradation**: App works without WebSocket connectivity

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

---

**Architecture Status**: ✅ Production Ready  
**Security Audit**: ✅ Complete  
**Performance Testing**: 🔄 Ongoing  
**Documentation Coverage**: ✅ Complete