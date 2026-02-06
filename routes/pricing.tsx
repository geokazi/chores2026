/**
 * Pricing Page - Plan selection with gift code support
 * GET /pricing
 * ~160 lines
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import { getPlan, getTrialInfo, hasPaidPlan } from "../lib/plan-gate.ts";
import { ReferralService } from "../lib/services/referral-service.ts";
import PricingCard from "../islands/PricingCard.tsx";
import AppHeader from "../islands/AppHeader.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface PricingPageData {
  isAuthenticated: boolean;
  familyId?: string;
  familyName?: string;
  currentPlan: string;
  trialDaysRemaining: number;
  referralBonus: number;
  hasPlan: boolean;
}

export const handler: Handlers<PricingPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      // Allow unauthenticated users to see pricing
      return ctx.render({
        isAuthenticated: false,
        currentPlan: "free",
        trialDaysRemaining: 0,
        referralBonus: 0,
        hasPlan: false,
      });
    }

    const planInfo = getPlan(session.family.settings);
    const trialInfo = getTrialInfo(session.family.settings);

    // Get referral bonus
    let referralBonus = 0;
    try {
      const referralService = new ReferralService();
      referralBonus = await referralService.getAvailableBonus(session.family.id);
    } catch (e) {
      console.warn("[pricing] Could not fetch referral bonus:", e);
    }

    return ctx.render({
      isAuthenticated: true,
      familyId: session.family.id,
      familyName: session.family.name,
      currentPlan: planInfo.type,
      trialDaysRemaining: trialInfo.daysRemaining,
      referralBonus,
      hasPlan: hasPaidPlan(session.family.settings),
    });
  },
};

export default function PricingPage({ data }: PageProps<PricingPageData>) {
  const { isAuthenticated, familyName, currentPlan, trialDaysRemaining, referralBonus, hasPlan } = data;

  return (
    <>
      <Head>
        <title>Pricing - ChoreGami</title>
      </Head>

      {isAuthenticated && (
        <AppHeader
          currentPage="pricing"
          pageTitle="Choose Your Plan"
          familyMembers={[]}
          currentUser={null}
          userRole="parent"
        />
      )}

      <main class="pricing-page">
        <div class="pricing-hero">
          <h1>Choose Your Plan</h1>
          {trialDaysRemaining > 0 && (
            <p class="trial-status">
              Your trial has <strong>{trialDaysRemaining} days</strong> remaining
            </p>
          )}
          {hasPlan && (
            <p class="current-plan">
              Current plan: <strong>{currentPlan}</strong>
            </p>
          )}
        </div>

        <PricingCard
          isAuthenticated={isAuthenticated}
          referralBonus={referralBonus}
        />

        {referralBonus > 0 && (
          <div class="referral-notice">
            <span class="referral-icon">💛</span>
            <span>You have <strong>{referralBonus} bonus month{referralBonus !== 1 ? "s" : ""}</strong> from referrals!</span>
          </div>
        )}

        {!isAuthenticated && (
          <div class="signup-cta">
            <p>Ready to get started?</p>
            <a href="/register" class="signup-button">Start Free Trial (15 days)</a>
          </div>
        )}
      </main>

      {isAuthenticated && <AppFooter />}

      <style>{`
        .pricing-page {
          min-height: calc(100vh - 120px);
          padding: 24px 20px 40px;
          max-width: 800px;
          margin: 0 auto;
          background: linear-gradient(145deg, #f0fdf4 0%, #fff 50%, #ecfdf5 100%);
        }
        .pricing-hero {
          text-align: center;
          margin-bottom: 32px;
        }
        .pricing-hero h1 {
          color: var(--color-text, #064e3b);
          font-size: 1.75rem;
          margin: 0 0 12px 0;
        }
        .trial-status {
          color: #f59e0b;
          font-size: 0.95rem;
          margin: 0;
        }
        .current-plan {
          color: #10b981;
          font-size: 0.95rem;
          margin: 0;
        }
        .referral-notice {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 16px;
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }
        .referral-icon {
          font-size: 1.5rem;
        }
        .signup-cta {
          text-align: center;
          margin-top: 32px;
          padding: 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .signup-cta p {
          margin: 0 0 16px 0;
          color: #064e3b;
        }
        .signup-button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .signup-button:hover {
          background: #059669;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}
