# 2026 UX Trends Assessment

**Date**: January 31, 2026
**Status**: 📋 Assessment Complete
**Related**: [Account Types & Personal Hubs](./20260131_account_types_personal_hubs.md)

## Overview

Web research assessment of ChoreGami's planned context-aware setup routes against modern 2026 UX design trends.

---

## Alignment with 2026 Trends

### Strong Alignment

| Trend | ChoreGami Design | Source |
|-------|------------------|--------|
| **Context-Aware Onboarding** | Invite/referral tokens pre-select account type | [Zeka Design](https://www.zekagraphic.com/top-10-ui-ux-design-trends-2026/) |
| **Progressive Disclosure** | 3 setup routes with escalating decisions (0→1→required) | [NN/G](https://www.nngroup.com/articles/progressive-disclosure/) |
| **Reduce Cognitive Load** | `/setup/join` = name only | [UsePilot](https://userpilot.com/blog/progressive-disclosure-examples/) |
| **Delayed Decisions** | Only organic signups choose persona | [Baymard](https://baymard.com/blog/delayed-account-creation) |
| **Personalization via Context** | Referrer's account_type suggests your type | [VWO](https://vwo.com/blog/mobile-app-onboarding-guide/) |
| **Zero-Friction for Social Spread** | Invited users skip persona selection | [UserGuiding](https://userguiding.com/blog/signup-flows-saas) |

### Key Statistics Supporting Our Design

| Statistic | Source |
|-----------|--------|
| **64% of users** drop off during typical SaaS signup flows | [UserGuiding](https://userguiding.com/blog/signup-flows-saas) |
| **27% abandon forms** that feel too long | [PingIdentity](https://www.pingidentity.com/en/resources/blog/post/frictionless-signup.html) |
| **42% of sites** still interrupt users with account creation too early | [Baymard](https://baymard.com/blog/delayed-account-creation) |
| Apps with great onboarding see **5X better engagement** | [Plotline](https://www.plotline.so/blog/mobile-app-onboarding-examples) |

---

## Identified Gaps

| Gap | Effort | Impact | Priority |
|-----|--------|--------|----------|
| Progress indicators ("Step 1 of 2") | **2-4 hrs** | Medium | P1 |
| Gamification transparency banner | **2-4 hrs** | Medium | P1 |
| Static demo mode (value before signup) | **1-2 days** | High | P2 |
| Biometric/passkey auth | **1-2 days** | Low-Medium | P3 |

**Total for P1s**: ~4-8 hours
**Total with P2**: ~2-3 days

---

## P1: Progress Indicators (2-4 hours)

**Trend**: Users need visual feedback on multi-step processes to reduce anxiety and abandonment.

**Implementation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 of 2                                    ●───────○       │
├─────────────────────────────────────────────────────────────────┤
│  Who's using this?                                              │
│  [Family] [Roommates] [Just Me]                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 2                                    ●───────●       │
├─────────────────────────────────────────────────────────────────┤
│  Your Name: [___________]                                       │
│  Family Name: [___________]                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Files to modify**:
- `routes/setup/new.tsx` (~10 lines)
- `routes/setup/referred.tsx` (~10 lines)
- `static/styles.css` (~20 lines for progress bar)

**Why**: Research shows progress indicators reduce form abandonment by setting clear expectations.

---

## P1: Gamification Transparency Banner (2-4 hours)

**Trend**: 2026 UX emphasizes transparency about how features work, especially for data-driven personalization.

**Implementation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️ Family mode uses points & rewards to motivate kids.        │
│     You can adjust this anytime in Settings.     [Learn more]  │
└─────────────────────────────────────────────────────────────────┘
```

**Files to modify**:
- `routes/setup/new.tsx` (~15 lines)
- `routes/setup/referred.tsx` (~15 lines)

**Why**: Transparency builds trust. Users who understand how gamification works are more likely to embrace it.

**Optional enhancement** (+2 hours):
- Add inline toggle to disable gamification during setup
- Store preference in `families.settings.apps.choregami.gamification_enabled`

---

## P2: Static Demo Mode (1-2 days)

**Trend**: "Value before signup" - let users experience the product before committing to account creation.

**Implementation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ChoreGami                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Get Started]        [👀 Try Demo First]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🎮 DEMO MODE                              [Exit Demo] [Sign Up]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sample Family Dashboard                                        │
│  ─────────────────────────────────────────────────────────────  │
│  👧 Emma: 3 chores today    [✓] [✓] [○]                       │
│  👦 Jake: 2 chores today    [✓] [○]                           │
│                                                                 │
│  Try completing a chore! Tap the checkbox.                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Approach Options**:

| Approach | Effort | Pros | Cons |
|----------|--------|------|------|
| **A. Static demo** | 1-2 days | Simple, no backend | Not fully interactive |
| **B. Sandbox mode** | 3-5 days | Fully interactive | Complex state management |
| **C. Video walkthrough** | 4-8 hrs | Easy to create | Not hands-on |

**Recommended**: Option A (Static Demo)

**Files to create**:
- `routes/demo.tsx` - Demo landing page (~100 lines)
- `islands/DemoKidDashboard.tsx` - Fake interactive dashboard (~150 lines)
- `islands/DemoChoreCard.tsx` - Interactive mock chore completion (~80 lines)
- `static/demo-data.json` - Sample family data (~50 lines)

**Why**: 64% of users drop off during signup. Demo mode shows value first, following DoorDash's pattern of "shifting friction to end of journey."

---

## P3: Passkey Auth (1-2 days)

**Trend**: Passwordless authentication via WebAuthn/passkeys is becoming mainstream in 2026.

**Implementation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sign in                                                        │
├─────────────────────────────────────────────────────────────────┤
│  [🔑 Sign in with Passkey]          ← NEW                      │
│  ─────────────────────────────────────────────────────────────  │
│  [📧 Continue with Email]                                       │
│  [📱 Continue with Phone]                                       │
│  [G Continue with Google]                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Dependencies**:
- Supabase WebAuthn support (in beta as of 2026)
- Browser compatibility: Safari 16+, Chrome 108+, Firefox 119+

**Files to create**:
- `islands/auth/PasskeyButton.tsx` (~80 lines)
- `routes/api/auth/passkey/register.ts` (~60 lines)
- `routes/api/auth/passkey/verify.ts` (~60 lines)
- Update `routes/login.tsx` (~10 lines)

**Why**: Passkeys eliminate password fatigue and phishing risks. However, Supabase WebAuthn API is still evolving, making this lower priority.

---

## Implementation Priority

| Priority | Feature | Effort | Cumulative |
|----------|---------|--------|------------|
| **P1** | Progress indicators | 2-4 hrs | 2-4 hrs |
| **P1** | Transparency banner | 2-4 hrs | 4-8 hrs |
| **P2** | Static demo mode | 1-2 days | 2-3 days |
| **P3** | Passkey auth | 1-2 days | 3-5 days |

**Recommendation**: Implement P1s immediately (quick wins), P2 for next sprint, P3 when Supabase WebAuthn stabilizes.

---

## Validation Metrics

After implementing these improvements, track:

| Metric | Current Baseline | Target |
|--------|------------------|--------|
| Signup completion rate | TBD | +15% |
| Time to first chore completion | TBD | -20% |
| Demo-to-signup conversion | N/A | 30%+ |
| Passkey adoption rate | N/A | 10%+ |

---

## Sources

- [Best Mobile App UI/UX Design Trends for 2026](https://natively.dev/blog/best-mobile-app-design-trends-2026)
- [Mobile App UI/UX Design Trends 2026 — Complete Guide](https://www.letsgroto.com/blog/mobile-app-ui-ux-design-trends-2026-the-only-guide-you-ll-need)
- [Best Mobile App Onboarding Examples in 2026](https://www.plotline.so/blog/mobile-app-onboarding-examples)
- [Save Account Creation for Confirmation Step - Baymard](https://baymard.com/blog/delayed-account-creation)
- [The Ultimate Mobile App Onboarding Guide 2026 - VWO](https://vwo.com/blog/mobile-app-onboarding-guide/)
- [12 Best Practices for Frictionless Sign Up Flows](https://www.pingidentity.com/en/resources/blog/post/frictionless-signup.html)
- [Top 10 UI/UX Design Trends 2026 - Zeka Design](https://www.zekagraphic.com/top-10-ui-ux-design-trends-2026/)

---

## Related Documentation

- [Account Types & Personal Hubs](./20260131_account_types_personal_hubs.md) - Main architecture brainstorm
- [Family Member Invites](../milestones/20260127_family_member_invites.md) - Invite flow implementation
- [Referral Share Feature](./20260130_referral_share_feature.md) - Referral system
- [Authentication Security Hardening](../milestones/20260118_authentication_security_hardening.md) - Current auth implementation
- [JSONB Settings Architecture](../20260114_JSONB_settings_architecture.md) - Settings storage pattern

---

**Author**: Development Team
**Created**: January 31, 2026
**Status**: 📋 Assessment Complete
