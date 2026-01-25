# ChoreGami 2026 - Simplified Chore Completion App

**Document Created**: January 6, 2026\
**Status**: ✅ **READY FOR IMPLEMENTATION**\
**Architecture**: Production-Ready with Existing Infrastructure

## Project Overview

ChoreGami 2026 is a **vastly simplified chore completion application** that
leverages the existing Choregami Eats infrastructure for maximum development
efficiency. The app focuses purely on chore completion with real-time family
gamification via FamilyScore WebSocket integration.

### Core Value Proposition

Transform routine family chores into an engaging, competitive experience with
**instant real-time updates** across all family devices, replacing traditional
polling with sub-second WebSocket broadcasts. Features comprehensive 
**FamilyScore sync integration** for data consistency and real-time gamification.

## Technology Stack

- **Frontend**: Deno Fresh application with Islands architecture
- **Database**: Existing Supabase PostgreSQL (reuse all credentials)
- **Authentication**: Existing multi-provider OAuth system
  (email/password/phone/social)
- **Real-time**: FamilyScore Phoenix Channels via WebSocket proxy
- **Styling**: CSS Custom Properties with Fresh Meadow theme
- **Deployment**: Deno Deploy (same as existing Choregami infrastructure)

## Working Directory

```
/Users/georgekariuki/repos/deno2/chores2026/
```

## 🎯 Development Principles

### Core Values

| Principle | Description |
|-----------|-------------|
| **Pareto (80/20)** | 20% effort for 80% value. Ship minimum viable, iterate based on feedback. |
| **No Code Bloat** | Every line must earn its place. Delete before you add. |
| **Reuse First** | Copy existing patterns from mealplanner/FamilyScore before writing new code. |
| **Simplicity** | Low cognitive load for users AND developers. If it needs explanation, simplify it. |
| **UX Ease** | Zero friction. One tap to complete a chore. No unnecessary screens. |
| **Maintainability** | Code that's easy to read, test, and modify. Future you is a user too. |
| **Flexibility** | Architecture supports growth without rewrites. JSONB > rigid schemas. |

### Code Constraints

| Constraint | Enforcement |
|------------|-------------|
| **Max 500 lines per module** | If exceeded, immediately refactor using composition and single responsibility. |
| **Small testable modules** | Each module does one thing. Easy to unit test in isolation. |
| **Composition over inheritance** | Build complex behavior from simple, reusable pieces. |
| **Single source of truth** | One place for each piece of logic (e.g., `calculateStreak` in insights-service.ts). |

### Decision Framework

Before writing code, ask:

1. **Does this already exist?** Check mealplanner, FamilyScore, existing services.
2. **Is this the simplest solution?** Can we solve 80% of the problem with 20% of the complexity?
3. **Will this exceed 500 lines?** If yes, split into smaller modules first.
4. **Is this testable in isolation?** If not, refactor for dependency injection.
5. **Does the user need this?** If uncertain, validate before building.

### Anti-Patterns to Avoid

- ❌ Gold-plating features nobody asked for
- ❌ Premature abstraction ("we might need this later")
- ❌ Monolithic files that do everything
- ❌ Duplicate logic in multiple places
- ❌ Complex solutions when simple ones work
- ❌ Adding dependencies when stdlib suffices

---

## 🚨 CRITICAL: REUSE EXISTING INFRASTRUCTURE

### ✅ **USE EXISTING CREDENTIALS (DO NOT CREATE NEW)**

- **Database**: Copy from
  `/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/.env.production`
- **FamilyScore API**: Production keys already configured
- **Authentication**: Multi-provider OAuth already set up
- **Supabase**: Production instance with all tables ready

### ✅ **USE EXISTING DATABASE TABLES**

```sql
-- Core tables (choretracker schema):
choretracker.chore_assignments     -- Individual chore instances
choretracker.chore_templates       -- Reusable chore definitions  
choretracker.chore_transactions    -- Point tracking (TransactionService)
choretracker.chore_categories      -- Chore organization
public.families                    -- Family organization + children_pins_enabled
public.family_profiles             -- Family members + pin_hash
```

### ✅ **REUSE EXISTING SERVICES**

- **TransactionService.ts**: Copy exactly from existing implementation with sync methods
- **Authentication system**: Copy login.tsx and auth components
- **FamilyScore integration**: Production-tested API keys and endpoints with sync capabilities

## Environment Configuration

### Required Environment Variables

Copy ALL variables from existing `.env.production`:

```bash
# Database (Production Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_KEY=your_supabase_anon_key

# FamilyScore Integration (Production)
FAMILYSCORE_API_KEY=your_familyscore_api_key
FAMILYSCORE_BASE_URL=https://your-familyscore-instance.com
FAMILYSCORE_WEBSOCKET_URL=wss://your-familyscore-instance.com/socket

# Authentication (Production OAuth)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# SMS/Phone Authentication
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Feature Flags
FAMILY_LEADERBOARD_ENABLED=true
DENO_ENV=production
```

## Core Features & Architecture

### Authentication Flow

1. **Parent Login**: Multi-provider authentication (email/password/phone/social)
2. **Kid Selection**: Tap profile → optional 4-digit PIN → access dashboard
3. **Security Model**: Parent session validates family access, kid PINs are UX
   convenience

### Chore Completion Flow

1. **Kid Dashboard**: View assigned chores with point values
2. **Chore Detail**: Instructions, completion button, history
3. **Real-time Sync**: Instant FamilyScore integration via TransactionService
4. **Celebration**: Point animation, new total, streak updates
5. **Family Broadcast**: All devices see leaderboard updates instantly

### Parent Controls

1. **Activity Monitoring**: Real-time feed of all family chore completions
2. **Point Adjustments**: Quick presets (Good/Extra/Half/Remove) with optional
   notes
3. **Bonus Awards**: Arbitrary point bonuses for exceptional behavior
4. **Family Settings**: PIN toggle, theme selection, chore management

### Real-time Features (WebSocket)

1. **Live Leaderboard**: Instant position updates across all devices
2. **Activity Feed**: Real-time chore completions with 🟢 live indicator
3. **Parent Notifications**: Immediate adjustment/bonus notifications to kids
4. **Cross-device Sync**: Changes on one device appear everywhere instantly

### FamilyScore Sync Integration

**Comprehensive Data Consistency**: Advanced sync endpoint integration ensures perfect data alignment between Chores2026 local transactions and FamilyScore's real-time gamification engine.

**Key Features**:
- **Manual Sync Button**: Parent dashboard "Sync FamilyScore" button for on-demand synchronization
- **Automatic Transaction Sync**: Every chore completion automatically syncs with FamilyScore
- **Discrepancy Resolution**: Three sync modes (compare/force_local/force_familyscore) handle conflicts
- **Non-blocking Error Handling**: Core functionality continues if FamilyScore unavailable
- **Startup Consistency Check**: Background sync on dashboard load ensures data alignment

**See Documentation**: [FamilyScore Sync Integration Guide](docs/familyscore-sync-integration.md)

## Application Structure

### Screen Map (13+ Screens)

```
Authentication (Parent Only):
├── Login Screen (copy existing)

Kid Experience:
├── Kid Selector Screen (post-login)
├── Kid Dashboard (main screen)
├── Chore Detail Screen
├── Completion Celebration
└── Parent Message Screen (adjustments/bonuses)

Parent Experience:
├── Parent Dashboard
├── Parent Activity Tab
├── Point Adjustment Modal
├── Bonus Award Screen
└── Family Settings

System Features:
├── Theme Selection (Fresh Meadow/Sunset Citrus/Ocean Depth)
└── PIN Setup/Entry Modals
```

### File Structure

```
chores2026/
├── routes/
│   ├── index.tsx                    # Kid Selector (after login)
│   ├── login.tsx                    # Copy from existing
│   ├── kid/
│   │   ├── [kid_id]/
│   │   │   ├── dashboard.tsx        # Kid main screen
│   │   │   └── chore/[chore_id].tsx # Chore detail
│   ├── parent/
│   │   ├── dashboard.tsx            # Parent main screen
│   │   ├── activity.tsx             # Activity monitoring
│   │   └── settings.tsx             # Family settings
│   └── api/
│       ├── chores/                  # CRUD operations
│       ├── transactions/            # Point tracking
│       ├── familyscore/            # WebSocket proxy
│       └── families/               # Settings management
├── islands/
│   ├── auth/                       # Copy existing auth islands
│   ├── KidSelector.tsx             # Family member selection
│   ├── KidDashboard.tsx            # Main kid interface
│   ├── ChoreList.tsx               # Assigned chores display
│   ├── ChoreCard.tsx               # Individual chore items
│   ├── CompletionButton.tsx        # "I Did This!" interaction
│   ├── CelebrationModal.tsx        # Point celebration
│   ├── LiveLeaderboard.tsx         # Real-time family rankings
│   ├── LiveActivityFeed.tsx        # Real-time chore feed
│   ├── ParentDashboard.tsx         # Parent overview
│   ├── ParentActivityTab.tsx       # Adjustment interface
│   ├── PointAdjustmentModal.tsx    # Point correction UI
│   ├── BonusAwardModal.tsx         # Bonus point awards
│   ├── FamilySettings.tsx          # Family configuration
│   ├── ThemePicker.tsx             # Color theme selection
│   ├── PinEntryModal.tsx           # 4-digit PIN input
│   └── WebSocketManager.tsx        # FamilyScore connection
├── lib/
│   ├── services/
│   │   ├── transaction-service.ts   # Copy exactly from existing
│   │   ├── chore-service.ts        # Basic CRUD operations
│   │   ├── familyscore-client.ts   # WebSocket integration
│   │   └── auth-service.ts         # Copy existing auth
│   ├── components/                 # Shared UI components
│   ├── types/                      # TypeScript definitions
│   └── utils/                      # Helper functions
├── static/
│   ├── themes.css                  # Color system
│   ├── animations.css              # Celebrations/transitions
│   └── oauth-fragment-handler.js   # Copy existing
└── deno.json                       # Fresh configuration
```

## Critical Implementation Patterns

### 🚨 Schema Requirement: choretracker Tables

**ALL queries to these tables MUST use `.schema("choretracker")`:**
- `family_events`
- `chore_assignments`
- `chore_transactions`
- `chore_templates`
- `chore_categories`

```typescript
// ✅ CORRECT
const { data } = await supabase
  .schema("choretracker")
  .from("family_events")
  .select("*");

// ❌ WRONG — queries public schema (empty/non-existent)
const { data } = await supabase
  .from("family_events")
  .select("*");
```

**Only `public` schema tables** (no `.schema()` needed): `families`, `family_profiles`

**Lint check**: `deno task lint:schema` catches violations automatically.

### 🔥 TransactionService Integration

**Copy EXACTLY from existing implementation** - this is production-tested code:

```typescript
// Copy from: /Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/lib/services/transaction-service.ts

import { TransactionService } from "../lib/services/transaction-service.ts";

const transactionService = new TransactionService();

// Chore completion automatically syncs to FamilyScore
await transactionService.recordChoreCompletion(
  choreId,
  pointValue,
  choreName,
  userId,
  familyId,
);

// Real-time leaderboard updates happen automatically
```

### 🔐 Security Architecture - WebSocket Proxy

**Server-side proxy for API key security**:

```typescript
// routes/api/familyscore/live/[family_id].ts
export const handler: Handlers = {
  async GET(req, ctx) {
    // 1. Verify user has access to this family
    const session = await getSession(req);
    if (session.family_id !== ctx.params.family_id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Upgrade client connection
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // 3. Connect to FamilyScore (server-side only - hides API key)
    const familyScoreWs = new WebSocket(
      `wss://your-familyscore-instance.com/families/${ctx.params.family_id}`,
      {
        headers: {
          "X-API-Key": Deno.env.get("FAMILYSCORE_API_KEY"),
        },
      },
    );

    // 4. Proxy messages with integrity validation
    familyScoreWs.onmessage = (event) => {
      clientSocket.send(event.data); // Forward to client
    };

    clientSocket.onmessage = (event) => {
      familyScoreWs.send(event.data); // Forward to FamilyScore
    };

    return response;
  },
};
```

### 📱 Kid PIN Logic (Simple vs Parent PINs)

**Dual PIN system - simple for kids, enterprise for parents**:

```typescript
const validatePin = async (profile, enteredPin) => {
  if (profile.role === "parent") {
    // Use existing enterprise PIN system (don't touch)
    return await parentPinValidation(profile, enteredPin);
  } else {
    // Simple kid PIN logic (localStorage + database backup)
    return await kidPinValidation(profile, enteredPin);
  }
};

const kidPinValidation = async (profile, enteredPin) => {
  // Primary: localStorage (instant access)
  const localHash = localStorage.getItem(`kid_pin_${profile.id}`);
  if (localHash) {
    return await bcrypt.compare(enteredPin, localHash);
  }

  // Fallback: database pin_hash (cross-device)
  if (profile.pin_hash) {
    const isValid = await bcrypt.compare(enteredPin, profile.pin_hash);
    if (isValid) {
      localStorage.setItem(`kid_pin_${profile.id}`, profile.pin_hash);
    }
    return isValid;
  }

  return false;
};
```

## Design System - Fresh Meadow Theme

### Color Palette

```css
:root {
  --color-primary: #10b981; /* Emerald Green */
  --color-secondary: #3b82f6; /* Sky Blue */
  --color-accent: #f59e0b; /* Amber (celebrations) */
  --color-bg: #f0fdf4; /* Mint Cream */
  --color-card: #ffffff; /* White cards */
  --color-text: #064e3b; /* Dark Green */
  --color-success: #22c55e; /* Bright Green */
  --color-warning: #ef4444; /* Red (corrections) */

  --gradient-complete: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --gradient-streak: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
}
```

### UI Principles

- **Mobile-first**: Card-based layout, big tap targets
- **Cognitive load minimized**: One action per screen, emoji-based UI
- **Real-time indicators**: 🟢 for live updates, 🔥 for streaks
- **Celebration focused**: Animations for point awards, visual feedback

## Development Commands

### Setup

```bash
# Create new Deno Fresh app
cd /Users/georgekariuki/repos/deno2/
deno run -A -r https://fresh.deno.dev chores2026

# Copy environment variables
cp neo4jmlplan/choregami-mealplanner/.env.production chores2026/.env

# Install dependencies
cd chores2026
deno cache main.ts
```

### Development

```bash
# Start development server
deno task dev

# Type checking
deno check **/*.ts

# Format code
deno fmt

# Run tests
deno test --allow-env --allow-net
```

### Database Operations

```bash
# Connect to existing Supabase
# No migrations needed - use existing tables

# Verify family_profiles.pin_hash column exists
# Verify families.children_pins_enabled column exists (already created)
```

### FamilyScore Integration Testing

```bash
# Test WebSocket connection
curl -H "x-api-key: your_familyscore_api_key" \
  https://your-familyscore-instance.com/health

# Test leaderboard API
curl -H "x-api-key: your_familyscore_api_key" \
  https://your-familyscore-instance.com/api/leaderboard/[family_id]
```

## Implementation Phases

### Phase 1: Core MVP (Week 1)

✅ **Basic app structure and authentication**

- Copy login.tsx from existing implementation
- Set up Fresh app with Islands architecture
- Configure environment variables and database connections
- Implement kid selector with family profile loading

✅ **Essential chore functionality**

- Kid dashboard with today's chores
- Basic chore completion (no celebrations yet)
- Simple leaderboard display (static data)
- Parent dashboard with activity overview

### Phase 2: Real-time Integration (Week 2)

✅ **FamilyScore WebSocket integration**

- Implement WebSocket proxy route for security
- Copy TransactionService.ts exactly for point tracking
- Real-time leaderboard updates via Phoenix Channels
- Live activity feed with 🟢 indicators

✅ **Enhanced user experience**

- Point celebration animations
- Streak tracking and display
- Cross-device synchronization
- Real-time parent notifications

### Phase 3: Parent Controls (Week 3)

✅ **Point adjustment system**

- Parent activity tab with adjustment options
- Quick presets (Good/Extra/Half/Remove)
- Custom point entry with optional notes
- Bonus award system for arbitrary points

✅ **Family management**

- PIN system with family toggle (children_pins_enabled)
- Theme selection (Fresh Meadow/Sunset Citrus/Ocean Depth)
- Basic chore template management
- Family settings and configuration

### Phase 4: Polish & Production (Week 4)

✅ **Mobile optimization**

- Responsive design for all screen sizes
- Touch-friendly interactions
- Performance optimization
- Offline handling and error states

✅ **Production readiness**

- Comprehensive error handling
- Loading states and transitions
- Security audit and testing
- Deployment to Deno Deploy

## Database Schema Reference

### Existing Tables (DO NOT MODIFY)

```sql
-- Family organization
public.families (
  id uuid PRIMARY KEY,
  children_pins_enabled boolean DEFAULT false -- ✅ ADDED
)

public.family_profiles (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  name text,
  role text, -- 'parent' | 'child'
  current_points integer DEFAULT 0,
  pin_hash text, -- Used for both parent (complex) and kid (simple) PINs
  user_id uuid -- Only parents have user_id, kids are null
)

-- Chore management
choretracker.chore_templates (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  name text,
  description text,
  points integer,
  category text
)

choretracker.chore_assignments (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  chore_template_id uuid REFERENCES chore_templates(id),
  assigned_to_profile_id uuid REFERENCES family_profiles(id),
  status text, -- 'pending' | 'completed' | 'verified'
  due_date timestamptz,
  point_value integer,
  assigned_date date DEFAULT CURRENT_DATE
)

choretracker.chore_transactions (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  profile_id uuid REFERENCES family_profiles(id),
  chore_assignment_id uuid REFERENCES chore_assignments(id),
  transaction_type text, -- 'chore_completed' | 'chore_reversed' | 'manual_adjustment' | 'bonus_award'
  points_change integer,
  balance_after_transaction integer,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
)
```

## Security Guidelines

### ✅ **ALLOWED OPERATIONS**

- __Read/write to existing choretracker._ tables_*
- **Use existing authentication system**
- **Copy proven patterns from existing codebase**
- **FamilyScore API calls via TransactionService only**
- **Client-side PIN validation for kids (UX convenience)**

### ❌ **FORBIDDEN OPERATIONS**

- **Creating new database tables or schemas**
- **Modifying existing table structures**
- **Creating new authentication systems**
- **Direct FamilyScore API calls (bypass TransactionService)**
- **Storing sensitive data in localStorage**

### 🔐 **Security Model**

- **Parent session**: Full family access via JWT
- **Kid PIN**: Device-only validation, not security boundary
- **WebSocket proxy**: Server-side API key protection
- **FamilyScore sync**: Non-blocking (app works without FamilyScore)
- **URL Security**: ✅ **NO USER GUIDs IN URL PATHS** (session-based routing only)

### 🚨 **CRITICAL: URL Security Implementation (Jan 11, 2026)**

**✅ SECURE URL PATTERNS (Required):**
```
/kid/dashboard                    # Pure session-based kid access
/kid/chore/[chore_id]            # NO user identification anywhere in URL
/parent/dashboard                # Family management
/parent/my-chores               # Personal parent chores
```

**❌ INSECURE PATTERNS (ALL forms deprecated):**
```
/kid/[user_guid]/dashboard           # ❌ User GUID in URL path
/kid/[user_guid]/chore/[chore_id]    # ❌ User GUID in URL path  
/kid/chore/[chore_id]?kid=[guid]     # ❌ User GUID in query parameter
/any/route?user=[guid]               # ❌ Any user GUID in URL
```

**Security Benefits:**
- **Server logs protection**: Zero user GUIDs in access logs (path OR query params)
- **Browser history protection**: No user identification anywhere in browser history  
- **Google/SEO protection**: No user GUIDs can be indexed by search engines
- **Cross-family protection**: Pure cookie-based session validation
- **URL sharing safety**: ALL URLs can be shared without exposing user identity
- **Accidental exposure prevention**: Copy/paste URL safe from user data leaks

**Implementation Method:**
- **Cookie-based sessions**: Server reads active kid from httpOnly cookie
- **No URL parameters**: Zero user identification in any part of URL
- **Session storage**: Client-side session management with browser tab isolation

**Implementation Status**: ✅ **100% Complete** - Pure session-only routing with NO GUIDs**

## Success Criteria

### Technical Milestones

- ✅ **Sub-second chore completion**: Tap → sync → celebration → leaderboard
  update
- ✅ **100% transaction coverage**: All point changes sync to FamilyScore
  automatically
- ✅ **Real-time family updates**: Changes on one device appear on all devices
  instantly
- ✅ **Mobile-optimized UX**: Works perfectly on phones for kids aged 6+
- ✅ **Production stability**: Reuses existing proven infrastructure

### User Experience Goals

- ✅ **Kids love it**: Immediate gratification, clear progress, fun celebrations
- ✅ **Parents trust it**: Transparent point tracking, easy oversight, reliable
  operation
- ✅ **Family engagement**: Competitive leaderboards drive sustained
  participation
- ✅ **Simplified workflow**: 80% effort reduction vs complex chore management
  systems

## Related Projects & References

### Existing Codebase References

- **Primary**:
  `/Users/georgekariuki/repos/deno2/neo4jmlplan/choregami-mealplanner/`
- **TransactionService**: Copy from `lib/services/transaction-service.ts`
- **Authentication**: Copy from `routes/login.tsx` and `lib/auth/`
- **Environment**: Copy from `.env.production`

### FamilyScore Integration

- **Repository**: `/Users/georgekariuki/repos/elixir/famscorepoc/`
- **API Documentation**: Production Phoenix application with comprehensive docs
- **WebSocket Endpoint**: `wss://your-familyscore-instance.com/socket`
- **Reference Architecture**: Centralized Transaction Service pattern

### Design References

- **ASCII Mockups**: Complete 13-screen design system documented above
- **Color Themes**: Fresh Meadow (primary), Sunset Citrus, Ocean Depth
- **Component Patterns**: Card-based layout, mobile-first responsive design

## Final Notes

This project represents a **strategic simplification** of the complex Choregami
Eats application, focusing purely on the core value proposition: **making family
chores engaging through real-time gamification**.

By reusing 100% of the existing infrastructure (database, authentication,
FamilyScore integration), we achieve enterprise-grade reliability while
dramatically reducing complexity and development time.

**The goal is 80% of the value with 20% of the complexity** - proven
architecture, battle-tested components, and focus on the essential user
experience that drives family engagement and chore completion.

---

**Status**: ✅ **READY FOR ONE-SHOT IMPLEMENTATION**\
**Next Step**: Build all 13 screens with real-time FamilyScore integration\
**Timeline**: 4-week phased implementation with MVP in Week 1
