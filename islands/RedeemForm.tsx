/**
 * Gift Code Redemption Form Island
 * Interactive form with success/error states
 * ~100 lines
 */

import { useState } from "preact/hooks";

interface Props {
  prefillCode?: string;
}

interface RedeemResult {
  success: boolean;
  plan_type?: string;
  expires_at?: string;
  message?: string;
  error?: string;
}

const PLAN_NAMES: Record<string, string> = {
  school_year: "School Year Plan",
  summer: "Summer Plan",
  full_year: "Full Year Plan",
};

export default function RedeemForm({ prefillCode }: Props) {
  const [code, setCode] = useState(prefillCode || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (result?.success) {
    const expiryDate = result.expires_at
      ? new Date(result.expires_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    return (
      <div class="redeem-success">
        <div class="success-icon">🎉</div>
        <h2>Gift Activated!</h2>
        <p class="plan-name">{PLAN_NAMES[result.plan_type || ""] || result.plan_type}</p>
        <p class="plan-expiry">Active until {expiryDate}</p>
        {result.message && <p class="gift-message">"{result.message}"</p>}
        <a href="/parent/settings" class="btn-primary">
          Start Using Templates
        </a>
        <style>{successStyles}</style>
      </div>
    );
  }

  // Form state
  return (
    <div class="redeem-form-container">
      <div class="form-header">
        <div class="gift-icon">🎁</div>
        <h2>Redeem Gift Code</h2>
      </div>

      {result?.error && <div class="error-message">{result.error}</div>}

      <form onSubmit={handleSubmit}>
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
          {loading ? "Redeeming..." : "Redeem"}
        </button>
      </form>

      <p class="help-text">
        Don't have a code? <a href="/parent/settings">See plans</a>
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
