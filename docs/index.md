# ChoreGami 2026 Documentation

**Project Overview**: A simplified, real-time chore completion system built with Deno Fresh, integrating with the existing FamilyScore ecosystem for family gamification.

## 🎯 Project Goals

Transform the complex Choregami Eats meal planning system into a streamlined chore management application focusing on:
- **Simplicity**: Easy-to-use interfaces for kids and parents
- **Real-time**: Live WebSocket integration with FamilyScore API
- **Reusability**: Leverage existing database schema and authentication
- **Mobile-first**: Touch-optimized design for family tablets/phones

## 📚 Documentation Structure

### 📋 Milestones & Progress

| Date | Milestone | Status | Description |
|------|-----------|--------|-------------|
| 2026-01-06 | [Initial Implementation](./milestones/20260106_initial_implementation.md) | ✅ Complete | Full-stack application with real-time features |
| TBD | Testing & Performance | 🔄 Planned | Test suite implementation and optimization |
| TBD | Production Deployment | 📅 Pending | CI/CD pipeline and monitoring setup |
| TBD | Feature Enhancement | 📋 Backlog | Advanced chore management and analytics |

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
- **LiveLeaderboard**: Family rankings with streak calculations
- **LiveActivityFeed**: Recent chore completions with animations
- **WebSocket Integration**: Secure proxy pattern for API key protection

### 🎨 User Experience

#### Kid Workflow
1. **Family Selection**: Choose from visual member grid
2. **PIN Authentication**: 4-digit entry (if enabled by parents)
3. **Today's Dashboard**: View assigned chores with completion status
4. **Chore Completion**: Follow instructions and mark complete
5. **Celebration**: Immediate point feedback with animations

#### Parent Workflow
1. **Family Overview**: Statistics dashboard with member activity
2. **Point Management**: Manual adjustments with transaction logging
3. **Security Settings**: Toggle PIN requirements for children
4. **Live Monitoring**: Real-time leaderboard and activity feed

### 🔐 Security & Privacy

#### Data Protection
- **PIN Security**: bcrypt hashing with salt for kid authentication
- **API Security**: Server-side proxy keeps FamilyScore keys protected
- **Session Management**: Secure cross-device synchronization
- **Input Validation**: Comprehensive parameter sanitization

#### Privacy Considerations
- **Family Data**: Isolated per family with role-based access
- **Transaction Logging**: Audit trails for all point changes
- **Error Handling**: No sensitive data exposure in error messages

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
- ✅ **Core Functionality**: Complete chore assignment and completion workflow
- ✅ **Real-time Features**: Live leaderboard and activity feeds
- ✅ **Authentication**: Multi-provider login with PIN security
- ✅ **Parent Controls**: Point adjustments and family settings
- ✅ **Mobile Design**: Responsive interface optimized for tablets/phones

### Known Limitations
- **Testing**: Comprehensive test suite not yet implemented
- **Chore Management**: Parent interface for creating/editing chores pending
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

### External Dependencies
- **[Deno Fresh](https://fresh.deno.dev/)**: SSR framework with Islands architecture
- **[Supabase](https://supabase.io/)**: PostgreSQL database and real-time features
- **[FamilyScore](https://familyscore.com/)**: Family gamification and point tracking

---

*Last updated: January 6, 2026*  
*Maintained by: Claude Code AI Assistant*