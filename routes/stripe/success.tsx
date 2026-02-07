/**
 * Stripe Success Page - Post-payment confirmation
 * GET /stripe/success?session_id=xxx
 * ~80 lines
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { getPlan } from "../../lib/plan-gate.ts";
import AppFooter from "../../components/AppFooter.tsx";

interface SuccessPageData {
  planType: string;
  expiresAt: string | null;
  familyName: string;
}

export const handler: Handlers<SuccessPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.family) {
      return new Response(null, { status: 303, headers: { Location: "/login" } });
    }

    const planInfo = getPlan(session.family.settings);
    const expiresAt = planInfo.expiresAt
      ? planInfo.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;

    return ctx.render({
      planType: planInfo.type,
      expiresAt,
      familyName: session.family.name,
    });
  },
};

export default function StripeSuccessPage({ data }: PageProps<SuccessPageData>) {
  const { planType, expiresAt, familyName } = data;

  const planLabels: Record<string, string> = {
    summer: "Summer (3 months)",
    school_year: "Half Year (6 months)",
    full_year: "Full Year (12 months)",
  };

  return (
    <>
      <Head>
        <title>Welcome to ChoreGami!</title>
      </Head>

      <div class="success-container">
        <div class="success-card">
          <div class="success-emoji">🎉</div>
          <h1>Welcome to ChoreGami!</h1>
          <p class="success-message">
            Your <strong>{planLabels[planType] || planType}</strong> plan is now active.
          </p>

          {expiresAt && (
            <p class="expiry-info">Valid until: <strong>{expiresAt}</strong></p>
          )}

          <a href="/" class="dashboard-button">Go to Dashboard</a>

          <p class="family-note">Ready to help {familyName} stay organized!</p>
        </div>
        <AppFooter />
      </div>

      <style>{`
        .success-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          padding: 1rem;
        }
        .success-card {
          background: white;
          padding: 3rem 2rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        .success-emoji {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        h1 {
          color: #10b981;
          margin: 0 0 1rem 0;
          font-size: 1.75rem;
        }
        .success-message {
          color: #064e3b;
          font-size: 1.1rem;
          margin: 0 0 0.5rem 0;
        }
        .expiry-info {
          color: #666;
          font-size: 0.95rem;
          margin: 0 0 1.5rem 0;
        }
        .dashboard-button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 0.875rem 2rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        .dashboard-button:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .family-note {
          color: #888;
          font-size: 0.875rem;
          margin: 1.5rem 0 0 0;
        }
      `}</style>
    </>
  );
}
