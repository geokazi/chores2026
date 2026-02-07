/**
 * Gift Code Redemption Form Island
 * Code-first flow: validates before requiring login
 * ~180 lines
 */

import { useState } from "preact/hooks";

interface Props {
  prefillCode?: string;
  isLoggedIn: boolean;
  hasFamily: boolean;
}

interface ValidationResult {
  valid: boolean;
  plan_type?: string;
  message?: string;
  error?: string;
}

interface RedeemResult {
  success: boolean;
  plan_type?: string;
  expires_at?: string;
  message?: string;
  error?: string;
}

const PLAN_NAMES: Record<string, string> = {
  school_year: "Half Year Plan",
  summer: "Summer Plan",
  full_year: "Full Year Plan",
};

/** Track feature interaction for analytics */
const trackFeature = (feature: string) => {
  fetch("/api/analytics/feature-demand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature }),
  }).catch(() => {}); // Non-blocking
};

export default function RedeemForm({ prefillCode, isLoggedIn, hasFamily }: Props) {
  const [code, setCode] = useState(prefillCode || "");
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);

  // Step 1: Validate code (no login required)
  const handleValidate = async (e: Event) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setValidation(null);
    trackFeature("redeem_validate_attempt");

    try {
      const response = await fetch("/api/gift/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        trackFeature("redeem_validate_success");
        setValidation(data);

        // Store in localStorage for preservation through auth flow
        localStorage.setItem('pendingGiftCode', code.trim());
        sessionStorage.setItem('pendingGiftCode', code.trim()); // Backup for OAuth
        if (data.plan_type) {
          localStorage.setItem('pendingGiftPlan', data.plan_type);
          sessionStorage.setItem('pendingGiftPlan', data.plan_type);
        }

        // If logged in AND has family, auto-redeem
        if (isLoggedIn && hasFamily) {
          await handleRedeem();
        }
      } else {
        trackFeature("redeem_validate_failure");
        setValidation({ valid: false, error: data.error || "Invalid code" });
      }
    } catch (err) {
      setValidation({ valid: false, error: "Network error. Please try again." });
      trackFeature("redeem_validate_failure");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Redeem code (requires login)
  const handleRedeem = async () => {
    setLoading(true);
    trackFeature("redeem_attempt");

    try {
      const response = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        trackFeature("redeem_success");
        // Clear localStorage on successful redemption
        localStorage.removeItem('pendingGiftCode');
        localStorage.removeItem('pendingGiftPlan');
        sessionStorage.removeItem('pendingGiftCode');
        sessionStorage.removeItem('pendingGiftPlan');
        setRedeemResult(data);
      } else {
        trackFeature("redeem_failure");
        setValidation({ valid: false, error: data.error || "Failed to redeem" });
      }
    } catch (err) {
      setValidation({ valid: false, error: "Network error. Please try again." });
      trackFeature("redeem_failure");
    } finally {
      setLoading(false);
    }
  };

  // Final success state
  if (redeemResult?.success) {
    const expiryDate = redeemResult.expires_at
      ? new Date(redeemResult.expires_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    return (
      <div class="redeem-success">
        <div class="success-icon">🎉</div>
        <h2>Gift Activated!</h2>
        <p class="plan-name">{PLAN_NAMES[redeemResult.plan_type || ""] || redeemResult.plan_type}</p>
        <p class="plan-expiry">Active until {expiryDate}</p>
        {redeemResult.message && <p class="gift-message">"{redeemResult.message}"</p>}
        <a href="/" class="btn-primary">
          Go to Dashboard
        </a>
        <style>{successStyles}</style>
      </div>
    );
  }

  // Code validated but not logged in OR logged in without family - prompt accordingly
  if (validation?.valid && (!isLoggedIn || !hasFamily)) {
    const returnUrl = encodeURIComponent(`/redeem?code=${encodeURIComponent(code)}`);

    return (
      <div class="redeem-validated">
        <div class="valid-icon">✅</div>
        <h2>Code Valid!</h2>
        <p class="plan-name">{PLAN_NAMES[validation.plan_type || ""] || validation.plan_type}</p>
        {validation.message && <p class="gift-message">"{validation.message}"</p>}

        {!isLoggedIn ? (
          <>
            <p class="signin-prompt">Sign in or create an account to activate your gift.</p>
            <div class="auth-buttons">
              <a href={`/login?returnTo=${returnUrl}`} class="btn-primary">
                Sign In
              </a>
              <a href={`/register?returnTo=${returnUrl}`} class="btn-secondary">
                Create Account
              </a>
            </div>
          </>
        ) : (
          <>
            <p class="signin-prompt">Complete your family setup to activate your gift.</p>
            <div class="auth-buttons">
              <a href="/setup" class="btn-primary">
                Complete Setup
              </a>
            </div>
          </>
        )}

        <style>{validatedStyles}</style>
      </div>
    );
  }

  // Form state - enter and validate code
  return (
    <div class="redeem-form-container">
      <div class="form-header">
        <div class="gift-icon">🎁</div>
        <h2>Redeem Gift Code</h2>
        <p class="form-subtitle">Enter your code to get started</p>
      </div>

      {validation?.error && <div class="error-message">{validation.error}</div>}

      <form onSubmit={handleValidate}>
        <input
          type="text"
          value={code}
          onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
          placeholder="GIFT-XXXX-XXXX-XXXX"
          class="code-input"
          maxLength={19}
          autoFocus
        />
        <button type="submit" class="btn-primary" disabled={!code.trim() || loading}>
          {loading ? "Checking..." : "Check Code"}
        </button>
      </form>

      <p class="help-text">
        Don't have a code? <a href="/pricing">See plans</a>
      </p>

      <style>{formStyles}</style>
    </div>
  );
}

const formStyles = `
  .redeem-form-container { text-align: center; }
  .form-header { margin-bottom: 1.5rem; }
  .gift-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .form-header h2 { margin: 0; color: var(--color-text, #064e3b); }
  .form-subtitle { color: #666; margin: 0.5rem 0 0 0; font-size: 0.9rem; }
  .error-message {
    background: #fee;
    color: #c00;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #fcc;
  }
  .code-input {
    width: 100%;
    padding: 1rem;
    font-size: 1.25rem;
    text-align: center;
    letter-spacing: 0.1em;
    border: 2px solid #e5e5e5;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-family: monospace;
    box-sizing: border-box;
  }
  .code-input:focus {
    outline: none;
    border-color: var(--color-primary, #10b981);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  .btn-primary {
    display: block;
    width: 100%;
    padding: 1rem;
    background: var(--color-primary, #10b981);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
  }
  .btn-primary:hover:not(:disabled) { background: #059669; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .help-text {
    margin-top: 1.5rem;
    color: #666;
    font-size: 0.875rem;
  }
  .help-text a { color: var(--color-primary, #10b981); }
`;

const validatedStyles = `
  .redeem-validated { text-align: center; }
  .valid-icon { font-size: 4rem; margin-bottom: 0.5rem; }
  .redeem-validated h2 { margin: 0 0 0.5rem 0; color: var(--color-primary, #10b981); }
  .plan-name { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; color: var(--color-text, #064e3b); }
  .gift-message {
    font-style: italic;
    color: #666;
    margin: 0.5rem 0 1rem 0;
    padding: 0.75rem;
    background: var(--color-bg, #f0fdf4);
    border-radius: 8px;
  }
  .signin-prompt {
    color: #666;
    margin: 1rem 0;
  }
  .auth-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .btn-primary {
    display: block;
    padding: 1rem;
    background: var(--color-primary, #10b981);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
  }
  .btn-primary:hover { background: #059669; }
  .btn-secondary {
    display: block;
    padding: 1rem;
    background: white;
    color: var(--color-primary, #10b981);
    border: 2px solid var(--color-primary, #10b981);
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
  }
  .btn-secondary:hover { background: var(--color-bg, #f0fdf4); }
`;

const successStyles = `
  .redeem-success { text-align: center; }
  .success-icon { font-size: 4rem; margin-bottom: 0.5rem; }
  .redeem-success h2 { margin: 0 0 1rem 0; color: var(--color-primary, #10b981); }
  .plan-name { font-size: 1.25rem; font-weight: 600; margin: 0; }
  .plan-expiry { color: #666; margin: 0.25rem 0 1rem 0; }
  .gift-message {
    font-style: italic;
    color: #666;
    margin: 1rem 0;
    padding: 1rem;
    background: var(--color-bg, #f0fdf4);
    border-radius: 8px;
  }
  .btn-primary {
    display: inline-block;
    padding: 1rem 2rem;
    background: var(--color-primary, #10b981);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    margin-top: 1rem;
  }
  .btn-primary:hover { background: #059669; }
`;
