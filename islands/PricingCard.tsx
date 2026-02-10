/**
 * PricingCard - Plan selection with Stripe checkout and gift code redemption
 * Island component for interactive pricing UI
 * Supports both subscription (auto-renew) and one-time payment modes
 * Supports plan preservation through signup flow via localStorage
 * ~350 lines
 */

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

const PENDING_PLAN_KEY = "pendingPlanSelection";

interface PricingCardProps {
  isAuthenticated: boolean;
  referralBonus: number;
}

type BillingMode = "subscription" | "onetime";

interface PlanOption {
  id: string;
  name: string;
  duration: string;
  price: string;
  perMonth: string;
  badge?: string;
  tagline?: string;
  benefits?: string[];
}

// One-time purchase plans (fixed term) - Strategic pricing Feb 2026
// Emotional hooks from blog research - prevents subscription cannibalization
const ONETIME_PLANS: PlanOption[] = [
  {
    id: "month_pass",
    name: "Trial",
    duration: "1 month",
    price: "$4.99",
    perMonth: "ONE-TIME PAYMENT",
    tagline: "Stop repeating yourself",
    benefits: ["Your 'I'll try anything' moment", "Test with skeptical kids", "See results in week 1"],
  },
  {
    id: "summer",
    name: "Summer",
    duration: "3 months",
    price: "$14.99",
    perMonth: "ONE-TIME PAYMENT",
    tagline: "Survive summer chaos",
    benefits: ["You get your evenings back", "House stays clean on autopilot", "No 'I'm bored' chore fights"],
  },
  {
    id: "school_year",
    name: "School Year",
    duration: "6 months",
    price: "$29.99",
    perMonth: "ONE-TIME PAYMENT",
    badge: "Most Popular",
    tagline: "Finally relax after dinner",
    benefits: ["No more 'did you do it yet?'", "Morning routines that work", "Whole school year covered"],
  },
  {
    id: "full_year",
    name: "Full Year",
    duration: "12 months",
    price: "$49.99",
    perMonth: "ONE-TIME PAYMENT",
    badge: "Best Value",
    tagline: "A full year of peace",
    benefits: ["365 days without nagging", "Less than $1/week", "Kids build real life skills"],
  },
];

// Subscription plans (auto-renewing) - Strategic pricing Feb 2026
// Aligned with gift pass pricing to prevent cannibalization
const SUBSCRIPTION_PLANS: PlanOption[] = [
  {
    id: "monthly",
    name: "Monthly",
    duration: "Billed monthly",
    price: "$4.99",
    perMonth: "/month",
    tagline: "Stop repeating yourself",
    benefits: ["Try it risk-free", "Kids help without nagging", "Cancel anytime (no contract)"],
  },
  {
    id: "annual",
    name: "Annual",
    duration: "Billed yearly",
    price: "$49.99",
    perMonth: "$4.17/month",
    badge: "Save 17%",
    tagline: "A full year of peace",
    benefits: ["They help WITHOUT being asked", "Less than $1/week", "Set it and forget it"],
  },
];

export default function PricingCard({ isAuthenticated, referralBonus }: PricingCardProps) {
  const loading = useSignal<string | null>(null);
  const billingMode = useSignal<BillingMode>("onetime");
  const giftCode = useSignal("");
  const giftCodeError = useSignal("");
  const giftCodeLoading = useSignal(false);
  const giftCodeSuccess = useSignal(false);

  // Buy as Gift state
  const buyAsGift = useSignal(false);
  const giftRecipientEmail = useSignal("");
  const giftRecipientName = useSignal("");
  const giftSenderName = useSignal("");
  const giftMessage = useSignal("");
  const giftPurchaseResult = useSignal<{ success: boolean; code?: string; error?: string } | null>(null);
  const giftPurchaseLoading = useSignal(false);

  // Check for pending plan selection after signup (auto-checkout)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check URL param first (from setup redirect)
    const params = new URLSearchParams(window.location.search);
    const checkoutPlan = params.get("checkout");
    const checkoutMode = params.get("mode") as BillingMode | null;

    if (checkoutPlan && ["month_pass", "summer", "school_year", "full_year"].includes(checkoutPlan)) {
      // Clear the URL param to prevent re-triggering
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Clear localStorage too
      localStorage.removeItem(PENDING_PLAN_KEY);

      // Set billing mode if provided
      if (checkoutMode && (checkoutMode === "subscription" || checkoutMode === "onetime")) {
        billingMode.value = checkoutMode;
      }

      // Trigger checkout
      handleSelectPlan(checkoutPlan);
    }
  }, [isAuthenticated]);

  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      // Store selected plan and billing mode for after signup
      localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({
        planId,
        billingMode: billingMode.value,
      }));
      window.location.href = "/register";
      return;
    }

    loading.value = planId;

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planType: planId,
          billingMode: billingMode.value,
        }),
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

  const handleBuyAsGift = async (planId: string) => {
    if (!isAuthenticated) {
      localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({
        planId,
        billingMode: billingMode.value,
        isGift: true,
      }));
      window.location.href = "/register";
      return;
    }

    // Validate email
    const email = giftRecipientEmail.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      giftPurchaseResult.value = { success: false, error: "Please enter a valid email address" };
      return;
    }

    giftPurchaseLoading.value = true;
    giftPurchaseResult.value = null;

    try {
      const response = await fetch("/api/gift/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planType: planId,
          recipientEmail: email,
          recipientName: giftRecipientName.value.trim() || undefined,
          senderName: giftSenderName.value.trim() || undefined,
          personalMessage: giftMessage.value.trim() || undefined,
          sendEmail: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        giftPurchaseResult.value = { success: true, code: data.giftCode };
      } else {
        giftPurchaseResult.value = { success: false, error: data.error || "Failed to purchase gift" };
      }
    } catch (error) {
      console.error("Gift purchase error:", error);
      giftPurchaseResult.value = { success: false, error: "Failed to purchase gift. Please try again." };
    } finally {
      giftPurchaseLoading.value = false;
    }
  };

  const copyGiftCode = () => {
    if (giftPurchaseResult.value?.code) {
      navigator.clipboard.writeText(giftPurchaseResult.value.code);
    }
  };

  return (
    <div class="pricing-card-container">
      {/* Buy as Gift Toggle */}
      <div class="gift-toggle">
        <label class="gift-toggle-label">
          <input
            type="checkbox"
            checked={buyAsGift.value}
            onChange={(e) => {
              buyAsGift.value = (e.target as HTMLInputElement).checked;
              giftPurchaseResult.value = null;
            }}
          />
          <span class="gift-toggle-text">🎁 Buy as a gift for someone else</span>
        </label>
      </div>

      {/* Billing Mode Toggle - Hidden when buying as gift */}
      {!buyAsGift.value && (
        <div class="billing-toggle">
          <button
            type="button"
            class={`billing-option ${billingMode.value === "onetime" ? "active" : ""}`}
            onClick={() => { billingMode.value = "onetime"; }}
          >
            <span class="billing-label">One-time</span>
            <span class="billing-desc">Pay once, use for the term</span>
          </button>
          <button
            type="button"
            class={`billing-option ${billingMode.value === "subscription" ? "active" : ""}`}
            onClick={() => { billingMode.value = "subscription"; }}
          >
            <span class="billing-label">Subscribe</span>
            <span class="billing-desc">Auto-renews, cancel anytime</span>
          </button>
        </div>
      )}

      {/* Gift Purchase Success */}
      {giftPurchaseResult.value?.success && (
        <div class="gift-success-card">
          <div class="gift-success-icon">🎉</div>
          <h3>Gift Purchased!</h3>
          <p>We've emailed the gift code to <strong>{giftRecipientEmail.value}</strong></p>
          <div class="gift-code-display">
            <code>{giftPurchaseResult.value.code}</code>
            <button type="button" onClick={copyGiftCode} class="copy-btn">Copy</button>
          </div>
          <p class="gift-success-note">You can also share this code directly with your recipient.</p>
          <button type="button" class="btn-new-gift" onClick={() => {
            giftPurchaseResult.value = null;
            giftRecipientEmail.value = "";
            giftRecipientName.value = "";
            giftMessage.value = "";
          }}>
            Buy Another Gift
          </button>
        </div>
      )}

      {/* Gift Form - Show when buying as gift and no success yet */}
      {buyAsGift.value && !giftPurchaseResult.value?.success && (
        <div class="gift-form">
          <h4>🎁 Send to someone special</h4>
          <div class="gift-form-field">
            <label>Their email *</label>
            <input
              type="email"
              placeholder="sarah@email.com"
              value={giftRecipientEmail.value}
              onInput={(e) => { giftRecipientEmail.value = (e.target as HTMLInputElement).value; }}
            />
          </div>
          <div class="gift-form-field">
            <label>Their name (optional)</label>
            <input
              type="text"
              placeholder="Sarah"
              value={giftRecipientName.value}
              onInput={(e) => { giftRecipientName.value = (e.target as HTMLInputElement).value; }}
            />
          </div>
          <div class="gift-form-field">
            <label>From (optional)</label>
            <input
              type="text"
              placeholder="Love, Mom"
              value={giftSenderName.value}
              onInput={(e) => { giftSenderName.value = (e.target as HTMLInputElement).value; }}
            />
          </div>
          <div class="gift-form-field">
            <label>Add a note (they'll love it!)</label>
            <textarea
              placeholder="Happy Birthday! Hope this helps with the morning chaos!"
              value={giftMessage.value}
              onInput={(e) => { giftMessage.value = (e.target as HTMLTextAreaElement).value; }}
              rows={2}
              maxLength={250}
            />
          </div>
          {giftPurchaseResult.value?.error && (
            <p class="gift-error">{giftPurchaseResult.value.error}</p>
          )}
        </div>
      )}

      {/* Plan Options - Show one-time plans only when buying as gift, hide if gift success */}
      {!giftPurchaseResult.value?.success && (
        <div class={`plan-grid ${!buyAsGift.value && billingMode.value === "subscription" ? "plan-grid-2" : ""}`}>
          {(buyAsGift.value ? ONETIME_PLANS : (billingMode.value === "onetime" ? ONETIME_PLANS : SUBSCRIPTION_PLANS)).map((plan) => (
            <div key={plan.id} class={`plan-option ${plan.badge ? "featured" : ""}`}>
              {plan.badge && <div class="plan-badge">{plan.badge}</div>}
              <h3 class="plan-name">{plan.name}</h3>
              {plan.tagline && <p class="plan-tagline">{plan.tagline}</p>}
              <p class="plan-duration">{plan.duration}</p>
              <p class="plan-price">{plan.price}</p>
              <p class={`plan-per-month ${plan.perMonth.includes("ONE-TIME") ? "one-time" : ""}`}>{plan.perMonth}</p>
              {plan.benefits && plan.benefits.length > 0 && (
                <ul class="plan-benefits">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                class="plan-button"
                onClick={() => buyAsGift.value ? handleBuyAsGift(plan.id) : handleSelectPlan(plan.id)}
                disabled={loading.value !== null || giftPurchaseLoading.value}
              >
                {(loading.value === plan.id || (giftPurchaseLoading.value && buyAsGift.value))
                  ? "Loading..."
                  : (buyAsGift.value ? "Send Gift" : "Select")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tax notice */}
      <p class="tax-notice">+ applicable taxes</p>

      {/* Trust badges */}
      <div class="trust-badges">
        <span class="trust-badge">🔒 Secure Checkout</span>
        <span class="trust-badge">📋 Tax Compliant</span>
        <span class="trust-badge">↩️ 30-Day Guarantee</span>
        {billingMode.value === "subscription" && <span class="trust-badge">🚫 Cancel Anytime</span>}
        <span class="trust-badge">👨‍👩‍👧‍👦 Family-First Support</span>
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
        .billing-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          padding: 4px;
          background: #f5f5f5;
          border-radius: 12px;
        }
        .billing-option {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .billing-option:hover:not(.active) {
          background: rgba(255, 255, 255, 0.5);
        }
        .billing-option.active {
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .billing-label {
          display: block;
          font-weight: 600;
          color: #064e3b;
          font-size: 0.95rem;
        }
        .billing-desc {
          display: block;
          font-size: 0.75rem;
          color: #666;
          margin-top: 2px;
        }
        .billing-option.active .billing-label {
          color: #10b981;
        }
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .plan-grid-2 {
          grid-template-columns: repeat(2, 1fr);
          max-width: 500px;
          margin: 0 auto;
        }
        @media (max-width: 800px) {
          .plan-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .plan-grid,
          .plan-grid-2 {
            grid-template-columns: 1fr;
          }
        }
        .tax-notice {
          text-align: center;
          color: #888;
          font-size: 0.8rem;
          margin: 12px 0 0 0;
        }
        .trust-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px 20px;
          margin: 16px 0 8px 0;
          padding: 12px;
          background: #f9fafb;
          border-radius: 10px;
        }
        .trust-badge {
          font-size: 0.75rem;
          color: #4b5563;
          white-space: nowrap;
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
          margin: 4px 0 12px 0;
        }
        .plan-per-month.one-time {
          color: #059669;
          font-weight: 600;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .plan-tagline {
          color: #10b981;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          font-style: italic;
        }
        .plan-benefits {
          list-style: none;
          padding: 0;
          margin: 0 0 16px 0;
          text-align: left;
        }
        .plan-benefits li {
          font-size: 0.8rem;
          color: #4b5563;
          padding: 4px 0 4px 20px;
          position: relative;
        }
        .plan-benefits li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: 700;
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
        .gift-toggle {
          margin-bottom: 16px;
          text-align: center;
        }
        .gift-toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 16px;
          background: #fef3c7;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .gift-toggle-label:hover {
          background: #fde68a;
        }
        .gift-toggle-label input {
          width: 18px;
          height: 18px;
          accent-color: #10b981;
        }
        .gift-toggle-text {
          font-size: 0.9rem;
          color: #92400e;
          font-weight: 500;
        }
        .gift-form {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .gift-form h4 {
          margin: 0 0 16px 0;
          color: #92400e;
          font-size: 1rem;
        }
        .gift-form-field {
          margin-bottom: 12px;
        }
        .gift-form-field label {
          display: block;
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 4px;
        }
        .gift-form-field input,
        .gift-form-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.95rem;
          box-sizing: border-box;
        }
        .gift-form-field input:focus,
        .gift-form-field textarea:focus {
          outline: none;
          border-color: #10b981;
        }
        .gift-form-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .gift-success-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #10b981;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        }
        .gift-success-icon {
          font-size: 3rem;
          margin-bottom: 8px;
        }
        .gift-success-card h3 {
          color: #10b981;
          margin: 0 0 8px 0;
        }
        .gift-success-card p {
          color: #064e3b;
          margin: 0 0 16px 0;
        }
        .gift-code-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 16px 0;
        }
        .gift-code-display code {
          background: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          letter-spacing: 1px;
          border: 1px solid #10b981;
        }
        .copy-btn {
          padding: 12px 16px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .copy-btn:hover {
          background: #059669;
        }
        .gift-success-note {
          font-size: 0.85rem;
          color: #666;
        }
        .btn-new-gift {
          margin-top: 16px;
          padding: 10px 20px;
          background: white;
          color: #10b981;
          border: 2px solid #10b981;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-new-gift:hover {
          background: #f0fdf4;
        }
      `}</style>
    </div>
  );
}
