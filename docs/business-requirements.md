# ChoreGami 2026 Business Requirements
**Version**: 1.0  
**Date**: January 6, 2026  
**Status**: ✅ Implemented

## 📋 Executive Summary

ChoreGami 2026 is a streamlined family chore management application designed to gamify household tasks through real-time point tracking and family leaderboards. The application bridges the gap between complex meal planning systems and simple chore tracking, focusing on user engagement and family participation.

### Business Goals
1. **Simplify Family Management**: Reduce friction in household chore assignment and completion
2. **Increase Engagement**: Gamify chores to motivate children and track family progress
3. **Leverage Existing Infrastructure**: Reuse Choregami database and FamilyScore integration
4. **Mobile-First Approach**: Optimize for family tablets and smartphones

## 🎯 Target Users

### Primary Users

#### Children (Ages 6-16) 👧👦
- **Motivation**: Visual progress tracking and immediate reward feedback
- **Pain Points**: Forgetting chores, lack of clear instructions, no sense of progress
- **Goals**: Complete tasks easily, see points earned, compare with siblings
- **Technical Comfort**: High with mobile devices, prefer simple interfaces

#### Parents (Adult age) 👨‍👩‍👧‍👦
- **Motivation**: Efficient family management and teaching responsibility
- **Pain Points**: Nagging kids, tracking completion, fair reward distribution
- **Goals**: Monitor progress, adjust rewards, ensure task completion
- **Technical Comfort**: Moderate to high, prefer comprehensive dashboards

### Secondary Users

#### Extended Family Members
- **Role**: Occasional chore assignment when visiting or babysitting
- **Needs**: Simple interface to view and assign basic tasks
- **Permissions**: Limited access to specific family functions

## 💼 Business Value Proposition

### For Families
- **Time Savings**: 60% reduction in chore management overhead
- **Increased Completion**: 75% improvement in chore completion rates
- **Fair Distribution**: Transparent point system prevents sibling disputes
- **Skill Building**: Teaches responsibility and work ethic through gamification

### For Product Ecosystem
- **User Retention**: Increases daily engagement with FamilyScore platform
- **Data Collection**: Valuable insights into family behavior patterns
- **Platform Integration**: Strengthens overall Choregami ecosystem value
- **Monetization**: Foundation for premium features and subscriptions

## 📊 User Stories & Requirements

### Epic 1: Kid Experience

#### Story 1.1: Chore Discovery
**As a child**, I want to see my chores for today in a simple visual format  
**So that** I know exactly what tasks I need to complete

**Acceptance Criteria:**
- ✅ Dashboard shows only today's assigned chores
- ✅ Visual icons represent different chore types
- ✅ Point values clearly displayed for each task
- ✅ Completion status immediately visible
- ✅ Mobile-optimized touch interface

**Business Value:** Reduces confusion and increases task completion rates

#### Story 1.2: Chore Completion
**As a child**, I want to mark chores as complete with simple interactions  
**So that** I can earn points and see immediate feedback

**Acceptance Criteria:**
- ✅ Single-tap completion with confirmation
- ✅ Detailed instructions for each chore
- ✅ Celebration animation when task completed
- ✅ Immediate point balance update
- ✅ Return to dashboard flow

**Business Value:** Increases engagement through instant gratification

#### Story 1.3: Progress Tracking
**As a child**, I want to see my points and ranking compared to family members  
**So that** I feel motivated to complete more chores

**Acceptance Criteria:**
- ✅ Live family leaderboard with current standings
- ✅ Personal point total prominently displayed
- ✅ Streak calculations for consistent completion
- ✅ Achievement indicators and badges
- ✅ Real-time updates when family members complete tasks

**Business Value:** Drives continued engagement and healthy competition

### Epic 2: Parent Experience

#### Story 2.1: Family Overview
**As a parent**, I want a dashboard showing all family members' progress  
**So that** I can monitor household task completion

**Acceptance Criteria:**
- ✅ Summary statistics for all family members
- ✅ Pending vs completed chore counts
- ✅ Total family points accumulated
- ✅ Recent activity feed with timestamps
- ✅ Quick access to individual member details

**Business Value:** Provides oversight without micromanagement

#### Story 2.2: Point Management
**As a parent**, I want to award bonus points or make adjustments
**So that** I can recognize extra effort or correct mistakes

**Acceptance Criteria:**
- ✅ Manual point adjustment interface
- ✅ Reason tracking for all adjustments
- ✅ Transaction history and audit trail
- ✅ Immediate sync with FamilyScore platform
- ✅ Notification to affected family member
- ✅ Parent PIN verification required before applying adjustments

**Business Value:** Maintains fairness and allows reward customization while preventing unauthorized changes

#### Story 2.3: Security Controls
**As a parent**, I want to control access to the system with PIN requirements
**So that** I can ensure appropriate usage by children

**Acceptance Criteria:**
- ✅ Toggle PIN requirement for all children
- ✅ Individual 4-digit PIN setup for each child
- ✅ Secure storage with encryption
- ✅ PIN verification before dashboard access
- ✅ PIN reset capability for parents
- ✅ Parent PIN required for sensitive operations:
  - Point adjustments
  - Removing family members
  - Settings changes

**Business Value:** Ensures security and prevents unauthorized access to sensitive family operations

### Epic 3: Events Calendar Integration

#### Story 3.1: Event-Linked Chores
**As a parent**, I want to link chores to family events like soccer practice or birthday parties
**So that** my kids see preparation tasks grouped together as "missions"

**Acceptance Criteria:**
- ✅ Create events with title, date, time, and optional emoji
- ✅ Link chores to events when creating assignments
- ✅ Events show "This Week" and "Upcoming" sections
- ✅ Delete events (soft delete, unlinks chores)
- ✅ Mobile-optimized event creation form

**Business Value:** Contextualizes chores around real family activities, increasing completion rates

#### Story 3.2: Event Mission Display
**As a child**, I want to see event-linked chores grouped together
**So that** I know what I need to do to get ready for activities

**Acceptance Criteria:**
- ✅ Event missions display as grouped sections on dashboard
- ✅ Points hidden for event missions (preparation focus)
- ✅ Celebration when all event tasks completed
- ✅ Progress indicator shows completion status
- ✅ Event time displayed with mission group

**Business Value:** Reduces cognitive load by organizing related tasks together

#### Story 3.3: Prep Tasks (Lightweight Checklist)
**As a parent**, I want to create quick prep task checklists for events
**So that** I can remind kids of simple preparations without creating full chores

**Acceptance Criteria:**
- ✅ Add multiple prep tasks at once via batch creation modal
- ✅ Edit existing prep tasks in the same modal
- ✅ Prep tasks stored in event metadata (not as full chores)
- ✅ Kids can mark prep tasks done with single tap
- ✅ No points for prep tasks (preparation focus, not gamification)
- ✅ Smart button shows count when tasks exist

**Business Value:** Reduces friction for simple checklist items that don't need point tracking

#### Story 3.4: Event Management (Edit/Delete)
**As a parent**, I want to edit existing events to update details
**So that** I can correct mistakes or update changed plans

**Acceptance Criteria:**
- ✅ Edit button on each event card
- ✅ Pre-populated form with existing event data
- ✅ Update title, date, time, emoji, participants
- ✅ Bottom-split card layout (actions at bottom)
- ✅ Clear visual hierarchy (info → actions)
- ✅ Mobile-friendly tap targets (min 36px height)

**Business Value:** Enables ongoing event management without recreating events

#### Story 3.5: Kid Event Creation (Planned)
**As a responsible teen**, I want to create my own events for activities like basketball practice or study groups
**So that** I can manage my schedule without needing a parent to enter everything

**Acceptance Criteria:**
- [ ] Family setting toggle: "Kids can create events" (OFF by default)
- [ ] When enabled, kids see "+ Add" button in Coming Up section
- [ ] If Kid PIN enabled, PIN required before creating event
- [ ] Events show "Added by [name]" attribution
- [ ] Parents have full visibility and edit access to all events
- [ ] Kid-created events appear in parent events page

**Business Value:** Teaches scheduling skills while maintaining parent oversight - differentiator in market

**Related Documents:**
- [Decision: Kid Event Creation](./decisions/20260120_kid_event_creation.md)
- [Implementation Details](./milestones/20260120_kid_event_creation.md)

### Epic 4: Real-Time Integration

#### Story 3.1: Live Updates
**As a family member**, I want to see real-time updates when others complete chores  
**So that** I stay motivated and informed about family progress

**Acceptance Criteria:**
- ✅ WebSocket connection to FamilyScore platform
- ✅ Instant leaderboard updates across devices
- ✅ Activity feed with recent completions
- ✅ Connection status indicators
- ✅ Graceful degradation when offline

**Business Value:** Creates shared family experience and encourages participation

#### Story 3.2: Cross-Device Sync
**As a user**, I want my progress to sync across all family devices  
**So that** I can access the system from any location

**Acceptance Criteria:**
- ✅ Real-time synchronization via WebSocket
- ✅ Consistent data across mobile and tablet
- ✅ Session persistence across device switches
- ✅ Conflict resolution for simultaneous updates
- ✅ Offline capability with sync on reconnection

**Business Value:** Increases accessibility and usage frequency

## 🔍 Competitive Analysis

### Direct Competitors

#### ChoreMonster
- **Strengths**: Established brand, gamification focus
- **Weaknesses**: Outdated UI, limited family features
- **Differentiation**: Our real-time integration and mobile-first design

#### Cozi Family Organizer
- **Strengths**: Comprehensive family management
- **Weaknesses**: Complex interface, limited gamification
- **Differentiation**: Our focused chore experience with point system

### Indirect Competitors

#### Traditional Chore Charts
- **Advantages**: Simple, no technology required
- **Disadvantages**: Static, no progress tracking, manual updates
- **Our Edge**: Digital convenience with gamification benefits

## 📈 Success Metrics

### User Engagement
- **Daily Active Users**: Target 80% of family members daily
- **Session Duration**: Average 5-10 minutes per session
- **Task Completion Rate**: 75% improvement over baseline
- **Return Rate**: 90% weekly retention for active families

### Business Impact
- **FamilyScore Integration**: 95% successful point sync rate
- **User Satisfaction**: 4.5+ app store rating
- **Support Tickets**: <1% of daily active users
- **Performance**: <2 second page load times

### Family Outcomes
- **Chore Completion**: 75% increase in completed tasks
- **Family Harmony**: Reduced chore-related conflicts
- **Responsibility Development**: Measurable improvement in child independence
- **Time Savings**: 60% reduction in chore management time for parents

## 🛠 Technical Requirements

### Performance Standards
- **Load Time**: <2 seconds on 3G connection
- **Responsiveness**: <100ms tap response time
- **Availability**: 99.5% uptime during peak family hours
- **Scalability**: Support 1000+ concurrent families

### Security Requirements
- **Data Protection**: COPPA compliance for children's data
- **Authentication**: Multi-factor options for parents
- **PIN Security**: bcrypt encryption for child PINs
- **API Security**: Rate limiting and input validation

### Integration Standards
- **FamilyScore API**: Real-time WebSocket connection
- **Database**: Reuse existing Choregami schema
- **Authentication**: Single sign-on with existing accounts
- **Mobile**: Progressive Web App capabilities

## 🔮 Future Roadmap

### Phase 1: Foundation (Completed ✅)
- Basic chore assignment and completion
- Real-time point tracking
- Family leaderboards
- Mobile-optimized interface

### Phase 2: Enhancement (Q1 2026)
- ✅ Events Calendar integration (event-linked chores as "missions")
- ✅ Prep Tasks feature (lightweight checklist items for events)
- ✅ Behavioral Insights (habit trends, streaks, routine patterns)
- ✅ New user onboarding (Getting Started view for users < 7 days)
- ✅ **Balance & Pay Out (P2)**: Per-kid balance cards, parent PIN-verified payouts
- ✅ **Rewards Marketplace (P3)**: Parent-defined catalog, parent-approval claim flow, starter templates
- ✅ **Savings Goals (P4)**: Kid-created goals, progress bars, parent boost
- Advanced chore management for parents
- Photo verification for task completion
- Achievement system and badges

### Phase 3: Advanced Features (Q2 2026)
- Integration with smart home devices
- Voice command support via Alexa/Google
- AI-powered chore suggestions
- Multi-family social features

### Phase 4: Monetization (Q3 2026)
- Premium subscription tiers
- Custom achievement creation
- Advanced family analytics
- White-label solutions for schools

## 💰 Revenue Model

### Freemium Structure

**Phase 1 (✅ Implemented Jan 19, 2026)**: Prepaid time-pass model via gift codes

| Tier | Access | Price |
|------|--------|-------|
| **Free** | Manual chores, Daily Basics, Dynamic Daily templates | $0 |
| **School Year Pass** | All templates (~10 months) | $49 |
| **Summer Pass** | All templates (3 months) | $19 |
| **Full Year Pass** | All templates (12 months) | $59 |

**Key Features:**
- Gift code redemption (`/redeem` page)
- Plan extension (codes add days, don't replace existing plans)
- JSONB-based plan storage (no database migrations)
- See: [Template Gating Implementation](./planned/20260118_template_gating_gift_codes.md)

**Phase 2 (Planned)**: Stripe integration for direct purchases
- In-app purchase flow
- Gift purchase for others
- Promo code management

### Premium Features (Family Plan)
- All 7 chore rotation templates (vs 3 free)
- Smart Family Rotation (biweekly patterns)
- Weekend Warrior (weekend-only schedules)
- Large Family Rotation (4-slot templates for 3-8 kids)
- Seasonal templates (Summer Break, School Year)
- Future: Custom achievement creation and rewards
- Future: Advanced analytics and progress reports

## 🎯 Go-to-Market Strategy

### Launch Phases

#### Soft Launch (Current)
- **Audience**: Existing Choregami families
- **Goal**: Validate core functionality and user experience
- **Metrics**: User feedback, completion rates, technical stability

#### Beta Expansion (Q1 2026)
- **Audience**: Invited families from waitlist
- **Goal**: Scale testing and feature refinement
- **Metrics**: Growth rate, retention, feature usage

#### Public Launch (Q2 2026)
- **Audience**: General family market
- **Goal**: Mass market adoption
- **Metrics**: Download rates, conversion to premium, market share

### Marketing Channels
1. **Content Marketing**: Parenting blogs, family lifestyle influencers
2. **App Store Optimization**: Category ranking for family apps
3. **Social Media**: Facebook groups, parenting communities
4. **Partnerships**: Integration with existing family apps
5. **Referral Program**: Family-to-family recommendations

## 📋 Risk Assessment

### Technical Risks
- **WebSocket Reliability**: Mitigation through graceful degradation
- **Database Performance**: Monitoring and optimization strategies
- **Mobile Compatibility**: Extensive device testing program
- **Security Vulnerabilities**: Regular security audits and updates

### Business Risks
- **Market Competition**: Focus on unique value proposition
- **User Adoption**: Comprehensive onboarding and tutorial system
- **Feature Creep**: Strict product roadmap discipline
- **Seasonal Usage**: Summer engagement strategies

### Operational Risks
- **Support Scaling**: Automated help system and FAQ
- **Data Privacy**: COPPA compliance and privacy by design
- **Platform Dependencies**: Multi-platform deployment strategy
- **Team Scaling**: Documentation and knowledge transfer

---

**Document Owner**: Product Team
**Review Cycle**: Monthly
**Last Updated**: January 25, 2026
**Next Review**: February 25, 2026
**Stakeholders**: Engineering, Design, Marketing, Customer Success