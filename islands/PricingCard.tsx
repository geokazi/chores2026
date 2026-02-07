/**
 * PricingCard - Plan selection with Stripe checkout and gift code redemption
 * Island component for interactive pricing UI
 * Supports plan preservation through signup flow via localStorage
 * ~250 lines
 */

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

const PENDING_PLAN_KEY = "pendingPlanSelection";

interface PricingCardProps {
  isAuthenticated: boolean;
  referralBonus: number;
}

interface PlanOption {
  id: "summer" | "school_year" | "full_year";
  name: string;
  duration: string;
  price: string;
  perMonth: string;
  badge?: string;
}

const PLANS: PlanOption[] = [
  { id: "summer", name: "Summer", duration: "3 months", price: "$29.99", perMonth: "$10/month" },
  { id: "school_year", name: "School Year", duration: "10 months", price: "$49.99", perMonth: "$5/month" },
  { id: "full_year", name: "Full Year", duration: "12 months", price: "$79.99", perMonth: "$6.67/month", badge: "Best Value" },
];

export default function PricingCard({ isAuthenticated, referralBonus }: PricingCardProps) {
  const loading = useSignal<string | null>(null);
  const giftCode = useSignal("");
  const giftCodeError = useSignal("");
  const giftCodeLoading = useSignal(false);
  const giftCodeSuccess = useSignal(false);

  // Check for pending plan selection after signup (auto-checkout)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check URL param first (from setup redirect)
    const params = new URLSearchParams(window.location.search);
    const checkoutPlan = params.get("checkout");

    if (checkoutPlan && ["summer", "school_year", "full_year"].includes(checkoutPlan)) {
      // Clear the URL param to prevent re-triggering
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Clear localStorage too
      localStorage.removeItem(PENDING_PLAN_KEY);

      // Trigger checkout
      handleSelectPlan(checkoutPlan);
    }
  }, [isAuthenticated]);

  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      // Store selected plan for after signup
      localStorage.setItem(PENDING_PLAN_KEY, planId);
      window.location.href = "/register";
      return;
    }

    loading.value = planId;

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planType: planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      loading.value = null;
    }
  };

  const handleRedeemGiftCode = async () => {
    const code = giftCode.value.trim().toUpperCase();
    if (!code) {
      giftCodeError.value = "Please enter a gift code";
      return;
    }

    giftCodeLoading.value = true;
    giftCodeError.value = "";

    try {
      const response = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        giftCodeSuccess.value = true;
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        giftCodeError.value = data.error || "Invalid gift code";
      }
    } catch (error) {
      console.error("Gift code error:", error);
      giftCodeError.value = "Failed to redeem code";
    } finally {
      giftCodeLoading.value = false;
    }
  };

  return (
    <div class="pricing-card-container">
      {/* Plan Options */}
      <div class="plan-grid">
        {PLANS.map((plan) => (
          <div key={plan.id} class={`plan-option ${plan.badge ? "featured" : ""}`}>
            {plan.badge && <div class="plan-badge">{plan.badge}</div>}
            <h3 class="plan-name">{plan.name}</h3>
            <p class="plan-duration">{plan.duration}</p>
            <p class="plan-price">{plan.price}</p>
            <p class="plan-per-month">{plan.perMonth}</p>
            <button
              type="button"
              class="plan-button"
              onClick={() => handleSelectPlan(plan.id)}
              disabled={loading.value !== null}
            >
              {loading.value === plan.id ? "Loading..." : "Select"}
            </button>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div class="or-divider">
        <span>or</span>
      </div>

      {/* Gift Code Section */}
      <div class="gift-code-section">
        <h4>Have a gift code?</h4>
        {giftCodeSuccess.value ? (
          <div class="gift-success">Gift code applied! Redirecting...</div>
        ) : (
          <div class="gift-code-form">
            <input
              type="text"
              placeholder="GIFT-XXXX-XXXX-XXXX"
              value={giftCode.value}
              onInput={(e) => { giftCode.value = (e.target as HTMLInputElement).value; }}
              class="gift-code-input"
              disabled={giftCodeLoading.value}
            />
            <button
              type="button"
              class="gift-code-button"
              onClick={handleRedeemGiftCode}
              disabled={giftCodeLoading.value}
            >
              {giftCodeLoading.value ? "..." : "Redeem"}
            </button>
          </div>
        )}
        {giftCodeError.value && <p class="gift-error">{giftCodeError.value}</p>}
      </div>

      {/* Referral Bonus Notice */}
      {referralBonus > 0 && (
        <div class="referral-info">
          <p>Your {referralBonus} bonus month{referralBonus !== 1 ? "s" : ""} will be applied automatically at checkout!</p>
        </div>
      )}

      <style>{`
        .pricing-card-container {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .plan-grid {
            grid-template-columns: 1fr;
          }
        }
        .plan-option {
          border: 2px solid #e5e5e5;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          position: relative;
          transition: all 0.2s ease;
        }
        .plan-option:hover {
          border-color: #10b981;
          transform: translateY(-2px);
        }
        .plan-option.featured {
          border-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, white 100%);
        }
        .plan-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .plan-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #064e3b;
          margin: 8px 0 4px 0;
        }
        .plan-duration {
          color: #666;
          font-size: 0.875rem;
          margin: 0 0 12px 0;
        }
        .plan-price {
          font-size: 1.75rem;
          font-weight: 700;
          color: #10b981;
          margin: 0;
        }
        .plan-per-month {
          color: #888;
          font-size: 0.8rem;
          margin: 4px 0 16px 0;
        }
        .plan-button {
          width: 100%;
          padding: 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .plan-button:hover:not(:disabled) {
          background: #059669;
        }
        .plan-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .or-divider {
          text-align: center;
          margin: 24px 0;
          position: relative;
        }
        .or-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          border-top: 1px solid #e5e5e5;
        }
        .or-divider span {
          background: white;
          padding: 0 16px;
          position: relative;
          color: #888;
          font-size: 0.875rem;
        }
        .gift-code-section {
          background: #fafafa;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .gift-code-section h4 {
          margin: 0 0 12px 0;
          color: #064e3b;
        }
        .gift-code-form {
          display: flex;
          gap: 8px;
          max-width: 320px;
          margin: 0 auto;
        }
        .gift-code-input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e5e5e5;
          border-radius: 8px;
          font-family: monospace;
          text-transform: uppercase;
        }
        .gift-code-input:focus {
          outline: none;
          border-color: #10b981;
        }
        .gift-code-button {
          padding: 12px 20px;
          background: #064e3b;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .gift-code-button:disabled {
          opacity: 0.6;
        }
        .gift-error {
          color: #ef4444;
          font-size: 0.875rem;
          margin: 8px 0 0 0;
        }
        .gift-success {
          color: #10b981;
          font-weight: 600;
        }
        .referral-info {
          margin-top: 16px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          text-align: center;
        }
        .referral-info p {
          margin: 0;
          color: #92400e;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
