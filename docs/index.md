# ChoreGami 2026 Documentation

**Version**: 1.9
**Status**: ✅ Production Ready
**Last Updated**: January 20, 2026

**Project Overview**: A simplified, real-time chore completion system built with Deno Fresh, transforming routine family chores into an engaging, competitive experience with sub-second real-time updates across all family devices.

## 🎯 Project Goals

Transform the complex Choregami Eats meal planning system into a streamlined chore management application focusing on:
- **Simplicity**: Zero cognitive load interfaces for kids and parents
- **Real-time**: Sub-second WebSocket integration with FamilyScore API
- **Security**: Session-based routing with no GUIDs in URLs
- **Multi-User**: Secure support for multiple family members on same device
- **20/80 Principle**: Maximum value with minimal complexity

## 📚 Documentation Structure

### 📋 Milestones & Progress

| Date | Milestone | Status | Description |
|------|-----------|--------|-------------|
| 2026-01-06 | [Initial Implementation](./milestones/20260106_initial_implementation.md) | ✅ Complete | Full-stack application with real-time features |
| 2026-01-06 | [**Conditional Kid PIN System**](./milestones/20260106_conditional_kid_pin_system.md) | ✅ Complete | Dual-mode PIN authentication with family controls |
| 2026-01-06 | [**FamilyScore Auto-Registration**](./milestones/20260106_familyscore_auto_registration.md) | ✅ Complete | Seamless family/user creation on first chore completion |
| 2026-01-08 | [**Parent Chore Completion**](./milestones/20260108_parent_chore_completion.md) | ✅ Complete | Parents can view and complete their assigned chores |
| 2026-01-10 | [**Secure Session Management**](./milestones/20260110_secure_session_management.md) | ✅ Complete | No GUIDs in URLs, multi-user browser support |
| 2026-01-10 | [**Personal Parent Dashboards**](./milestones/20260110_personal_parent_dashboards.md) | ✅ Complete | Individual parent views separate from family dashboard |
| 2026-01-11 | [**Real-Time WebSocket & Critical Security**](./milestones/20260111_real_time_websocket_security_implementation.md) | ✅ Complete | Strategic WebSocket integration + complete URL GUID elimination |
| 2026-01-11 | [**Parent PIN Security System**](./20260111_parent_pin_security_implementation.md) | ✅ Complete | PIN protection with profile-switch clearing & instant verification |
| 2026-01-11 | [**Fly.io Deployment Migration Guide**](./20260111_flyio_deployment_migration_guide.md) | 📋 Ready | Comprehensive migration plan from Cloud Run to Fly.io |
| 2026-01-12 | [**Complete Chore Workflow & Theme Access**](./milestones/20260112_complete_chore_workflow_and_theme_access.md) | ✅ Complete | Universal chore completion + kid theme access + security fixes |
| 2026-01-12 | [**FamilyScore Sync Integration**](./20260112_familyscore_sync_integration.md) | ✅ Complete | Production-ready sync endpoint with data consistency management |
| 2026-01-13 | [**Sync Fixes & UI Improvements**](./milestones/20260113_sync_fixes_and_ui_improvements.md) | ✅ Complete | Enhanced sync functionality + improved interface labeling |
| 2026-01-14 | [**Family Reports & Analytics**](./20260114_family_reports_analytics_implementation.md) | ✅ Complete | Savings-focused reports with Week/Month/YTD/All Time earnings + Goals Achieved cards by person |
| 2026-01-14 | [**Session Caching Optimization**](./20260114_cache_strategy_session_optimization.md) | ✅ Complete | Batch-fetched family data reduces DB queries 20-40% |
| 2026-01-14 | [**JSONB Settings Architecture**](./20260114_JSONB_settings_architecture.md) | ✅ Complete | Flexible cross-app settings storage with inheritance |
| 2026-01-14 | [**Collaborative Family Goals**](./milestones/20260114_collaborative_family_goals_bonus_system.md) | ✅ Complete | Weekly family goal with auto-bonus - collaboration over competition |
| 2026-01-14 | [**Weekly Patterns Analysis**](./milestones/20260114_weekly_patterns_analysis.md) | ✅ Complete | Heatmap + insights showing busiest/slowest days per kid |
| 2026-01-15 | [**Chore Rotation Templates**](./chore-templates-design.md) | ✅ Complete | Pre-built chore schedules (Smart Rotation, Weekend Warrior, Daily Basics) |
| 2026-01-15 | [↳ Implementation Gaps](./milestones/20260115_chore-templates-gaps.md) | ✅ Complete | Virtual chore pattern + TransactionService integration |
| 2026-01-15 | [↳ JSONB Schema Design](./milestones/20260115_chore-templates-jsonb-schema.md) | ✅ Complete | Template customization with Override Layer Pattern |
| 2026-01-16 | [↳ Seasonal Templates](./milestones/20260116_seasonal-templates-implementation.md) | ✅ Complete | Summer Break + School Year templates with category grouping |
| 2026-01-17 | [↳ Large Family & Partial Assignment](./milestones/20260117_large_family_template_partial_assignment.md) | ✅ Complete | 4-slot template for 3-8 kids + partial slot assignment |
| 2026-01-17 | [↳ **Dynamic Template Expansion**](./milestones/20260117_dynamic_template_expansion.md) | ✅ Complete | Distribution-based chores scale to any family size (1-8 kids) |
| 2026-01-18 | [**Legal Pages & Auth Flow Fixes**](./milestones/20260118_legal_pages_auth_flow_fixes.md) | ✅ Complete | Parent-friendly Terms, COPPA-aware Privacy, phone OTP redirect fix |
| 2026-01-18 | [**Authentication Security Hardening**](./milestones/20260118_authentication_security_hardening.md) | ✅ Complete | Rate limiting, enumeration protection, honeypot bot detection |
| 2026-01-19 | [**Template Gating & Gift Codes**](./planned/20260118_template_gating_gift_codes.md) | ✅ Complete | Prepaid plan tiers ($19-$59), gift code redemption, template access control, TemplateSelector extraction |
| 2026-01-19 | [**Signup & PIN Detection Fixes**](./milestones/20260119_signup_and_pin_fixes.md) | ✅ Complete | Fixed Supabase schema config, first-time PIN UX, settings order, PIN detection after logout |
| 2026-01-19/20 | [**Events Calendar & Prep Tasks**](./milestones/20260120_events_prep_tasks_implementation.md) | ✅ Complete | Event-linked chores as "missions", prep tasks (no points), parent events page |
| 2026-01-19/20 | [↳ Original Planning](./milestones/20260119_events_calendar_original_plan.md) | ✅ Complete | Design decisions and philosophy |
| 2026-01-19/20 | [↳ Hybrid Implementation Guide](./milestones/20260119_events_calendar_rev2_plan.md) | ✅ Complete | MealPlanner analysis and approach |
| 2026-01-20 | [**Navigation UX Improvements**](./milestones/20260120_navigation_ux_improvements.md) | ✅ Complete | Inline user switcher, active nav indicator, reduced switching friction |
| 2026-01-20 | [**Events Display Fixes**](./investigations/20260120_events_not_showing_diagnosis.md) | ✅ Complete | Event-linked chores default to event date, timezone fixes, explicit FK joins |
| TBD | [Event Library & Reuse](./planned/20260120_event_library_reuse.md) | 📋 Planned | Quick recreation of past events |
| TBD | [Kid Event Creation](./planned/20260120_kid_event_creation.md) | 📋 Planned | Teens create own events with parent visibility |
| TBD | Testing & Performance | 🔄 Planned | Test suite implementation and optimization |
| TBD | Production Deployment | 📅 Pending | CI/CD pipeline and monitoring setup |

### 🎯 Architecture Decisions

| Date | Decision | Status | Summary |
|------|----------|--------|---------|
| 2026-01-20 | [Feedback Strategy](./decisions/20260120_feedback_strategy.md) | ✅ Decided | Google Form now, in-app JSONB at 100+ users |
| 2026-01-20 | [Analytics Strategy](./decisions/20260120_analytics_strategy.md) | ✅ Decided | External analytics (Plausible) + existing data; don't extend FamilyScore |
| 2026-01-20 | [Kid Event Creation](./decisions/20260120_kid_event_creation.md) | ✅ Decided | Allow kids to create events with parent visibility, gated by existing PIN |
| 2026-01-20 | Tablet/Desktop Styling | ✅ Deferred | Mobile-first approach; revisit with analytics data |

### 📖 Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [🏢 Business Requirements](./business-requirements.md) | Product specifications, user stories, and success metrics | Product, Business, QA |
| [🛠 Technical Documentation](./technical-documentation.md) | Architecture, implementation details, and API reference | Engineering, DevOps |

### 🛠 Technical Documentation

#### Architecture
- **Framework**: Deno Fresh with Islands architecture
- **Database**: PostgreSQL via Supabase (reused `choretracker.*` schema)
- **Real-time**: WebSocket proxy to FamilyScore Phoenix Channels
- **Authentication**: Multi-provider system (email, phone, social OAuth)
- **Styling**: Fresh Meadow theme with mobile-first responsive design

#### Key Services
- **ChoreService**: CRUD operations for chores, families, and assignments
- **TransactionService**: Production-tested point tracking with FamilyScore sync
- **AuthenticationService**: Secure session management across devices

#### Real-time Features
- **LiveLeaderboard**: Family rankings with streak calculations and sub-2-second updates
- **LiveActivityFeed**: Recent chore completions with animations
- **Strategic WebSocket Integration**: Direct FamilyScore Phoenix Channel connection
- **Cross-Device Sync**: Real-time points updates across all family devices

### 🎨 User Experience

#### Kid Workflow
1. **Family Selection**: Choose from visual member grid with ranking display
2. **PIN Authentication**: Optional 4-digit entry (parent-controlled family setting)
   - **PIN Disabled**: Instant dashboard access
   - **PIN Enabled**: Simple 4-digit validation with 30-minute sessions
3. **Today's Dashboard**: View assigned chores with completion status and point values
4. **Chore Completion**: Follow instructions and mark complete with instant feedback
5. **Celebration**: Immediate point feedback with animations and streak tracking

#### Parent Workflow
1. **Family Selection**: Choose from visual member grid (same as kids)
2. **Personal Dashboard**: View and complete own assigned chores (`/parent/my-chores`)
   - Checkbox completion interface (consistent with kid UX)
   - Personal progress tracking and point display
   - Due date and time information
3. **Family Management**: Switch to family oversight (`/parent/dashboard`)
   - Statistics dashboard with member activity and leaderboard
   - Add chores and assign to any family member (including other parents) 
   - **Theme customization accessible to all family members** (no PIN required)
   - Links to PIN-protected settings and point adjustments
4. **PIN-Protected Operations**: Sensitive actions require parent PIN verification
   - **Point adjustments**: PIN required before applying any point changes
   - **Member removal**: PIN required to remove family members
   - **Profile-switch clearing**: PIN required when switching from kid profiles back to parent
   - **Instant verification**: Sub-second PIN validation for seamless UX
5. **Real-Time Updates**: Live leaderboard and activity feed via WebSocket

### 🔐 Security & Privacy

#### Data Protection
- **Secure Session-Based Routing**: No GUIDs in URLs, session-based user identification  
- **Multi-User Browser Support**: Unique session IDs prevent conflicts between family members
- **Dual Authentication Model**: Enterprise JWT for parents, convenience PINs for kids
- **PIN Security**: Kid PINs with bcrypt, Parent PINs with instant plaintext verification
- **Session Isolation**: Browser tab-specific sessions with localStorage + sessionStorage
- **API Security**: Server-side WebSocket proxy keeps FamilyScore keys protected
- **Cross-Family Protection**: Strict family isolation with parent session validation
- **Input Validation**: Comprehensive parameter sanitization across all endpoints

#### Privacy Considerations
- **Family Data**: Isolated per family with role-based access
- **Transaction Logging**: Audit trails for all point changes
- **Error Handling**: No sensitive data exposure in error messages
- **Legal Compliance**: [Privacy Policy](/privacy) is COPPA-aware; [Terms of Service](/terms) are parent-friendly
- **Children's Data**: No email, phone, location, or marketing data collected for children

## 🚀 Getting Started

### Prerequisites
- Deno 2.0+
- Supabase database with `choretracker.*` schema
- FamilyScore API credentials (optional for WebSocket features)

### Quick Start
```bash
# Clone and navigate to project
cd /Users/georgekariuki/repos/deno2/chores2026

# Install dependencies (auto-resolved by Deno)
deno task check

# Start development server
deno task start

# Access application
open http://localhost:8001
```

### Environment Setup
Create `.env.local` with required variables:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# FamilyScore Integration (Optional)
FAMILYSCORE_BASE_URL=your_familyscore_api_url
FAMILYSCORE_API_KEY=your_api_key
FAMILYSCORE_WS_URL=your_websocket_url

# Twilio (Optional - for phone auth)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service
```

## 📊 Project Status

### Current State
- ✅ **Complete Chore Workflow**: Both kids and parents can successfully complete assigned chores with unified API support
- ✅ **Enhanced FamilyScore Sync**: Production-ready sync with force_local mode and complete data consistency
- ✅ **Kid-Friendly Theme Access**: Kids can access `/parent/dashboard` without PIN to customize app themes freely
- ✅ **Working Theme System**: Full theme switching with persistence (Fresh Meadow, Sunset Citrus, Ocean Depth)
- ✅ **Improved User Interface**: Clear labeling with "Family Dashboard" and "Switch Profile" terminology
- ✅ **Secure Session Management**: No GUIDs in URLs, multi-user browser support with session isolation
- ✅ **Personal Parent Dashboards**: Individual parent views separate from family management dashboard
- ✅ **Strategic Real-Time Features**: Sub-2-second WebSocket updates across all family devices
- ✅ **Critical Security Fixes**: Parent PIN cancel bypass vulnerability resolved, no unauthorized access possible
- ✅ **Authentication**: Multi-provider login with dual-mode PIN system and session-based routing
- ✅ **Conditional Security**: Parent-controlled PIN requirements with family-wide enable/disable
- ✅ **Cross-Device Sessions**: Browser tab-specific sessions with localStorage + sessionStorage
- ✅ **Universal Chore Assignment**: Parents can assign chores to themselves, other parents, and children
- ✅ **Consistent UX**: Checkbox completion interface shared between kids and parents
- ✅ **Mobile Design**: Touch-optimized interface with zero cognitive load design
- ✅ **Auto-Registration**: Seamless FamilyScore family/user creation on first use
- ✅ **Family Reports**: Savings-focused analytics with Week/Month/YTD/All Time earnings + Goals Achieved aggregated by person (card layout)
- ✅ **Session Caching**: Batch-fetched family data reduces DB queries 20-40%
- ✅ **JSONB Settings**: Flexible cross-app configuration storage with inheritance pattern
- ✅ **Collaborative Family Goals**: Weekly goal system with auto-bonus when reached - collaboration over competition
- ✅ **Weekly Patterns Analysis**: Heatmap + text insights showing busiest/slowest days per kid (last 60 days)
- ✅ **Chore Rotation Templates**: 7 pre-built schedules including **Dynamic Daily Routines** (scales to any family size 1-8 kids) + slot-based templates (Smart Rotation, Weekend Warrior, Daily Basics, Large Family, Summer Break, School Year) with Manual (Default) option + partial slot assignment
- ✅ **Template Gating & Gift Codes**: Prepaid plan tiers (Free vs Family Plan), gift code redemption (`/redeem`), JSONB-based plan storage, TemplateSelector component extraction, ACTIVE badge on templates, improved Free Plan UX
- ✅ **Point Adjustment Security**: Parent PIN verification required before applying any point adjustments
- ✅ **Events Calendar Integration**: Event-linked chores as "missions" on kid dashboard, parent events page (`/parent/events`), create/edit events, points hiding for event missions, preparation-focused UX
- ✅ **Prep Tasks Feature**: Lightweight checklist items stored in event metadata, batch creation/editing, kids can mark done with optimistic UI, no points (preparation focus)
- ✅ **Events Page UX Polish**: Bottom-split card layout, centered Add Event button, event-specific emojis, improved tap targets, clear visual hierarchy
- ✅ **Navigation UX**: Inline user switcher (2-click profile switching), active nav indicator, clickable participant links on events

### Known Limitations
- **Testing**: Comprehensive test suite not yet implemented
- **Advanced Chore Management**: Recurring chores, bulk operations
- **Offline Support**: PWA capabilities planned but not implemented
- **Performance Monitoring**: Telemetry and error tracking to be added

### Next Priorities
1. **Quality Assurance**: Implement unit and integration tests
2. **Performance**: Optimize bundle size and runtime performance  
3. **Accessibility**: WCAG 2.1 compliance verification
4. **Deployment**: CI/CD pipeline and production monitoring

## 🤝 Contributing

### Development Workflow
1. Review existing [milestones](./milestones/) for context
2. Create feature branch following naming convention
3. Implement changes with tests and documentation
4. Update relevant milestone documentation
5. Submit for review with performance impact analysis

### Code Standards
- **TypeScript**: Strict mode with full type safety
- **Formatting**: Deno fmt with consistent style
- **Linting**: Security-focused rules with no-any enforcement
- **Documentation**: Inline comments for complex business logic

## 📞 Support & Resources

### Project References
- **Main Documentation**: [CLAUDE.md](../CLAUDE.md) - Comprehensive technical specifications
- **Architecture**: Based on production Choregami Eats system
- **Design System**: Fresh Meadow theme with nature-inspired palette
- **FamilyScore**: Integration with existing family gamification platform
- **Security Implementation**: [Parent PIN System](./20260111_parent_pin_security_implementation.md) - PIN protection architecture
- **Deployment Guide**: [Fly.io Migration](./20260111_flyio_deployment_migration_guide.md) - Production deployment strategy

### External Dependencies
- **[Deno Fresh](https://fresh.deno.dev/)**: SSR framework with Islands architecture
- **[Supabase](https://supabase.io/)**: PostgreSQL database and real-time features
- **[FamilyScore](https://familyscore.com/)**: Family gamification and point tracking

---

*Last updated: January 20, 2026*
*Maintained by: Claude Code AI Assistant*