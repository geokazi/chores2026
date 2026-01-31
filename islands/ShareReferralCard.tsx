import { useSignal } from "@preact/signals";

interface ShareReferralCardProps {
  code: string;
  conversions: number;
  monthsEarned: number;
}

export default function ShareReferralCard({ code, conversions, monthsEarned }: ShareReferralCardProps) {
  const copied = useSignal(false);
  const shareUrl = `https://choregami.app/r/${code}`;

  // Debug logging
  console.log("[Referral] ShareReferralCard mounted", { code, conversions, monthsEarned, shareUrl });

  const handleCopy = async () => {
    console.log("[Referral] Copy clicked", { shareUrl });
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied.value = true;
      console.log("[Referral] Copied to clipboard successfully");
      setTimeout(() => { copied.value = false; }, 2000);
    } catch (err) {
      console.log("[Referral] Clipboard API failed, using fallback", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2000);
    }
  };

  const handleShare = async () => {
    console.log("[Referral] Share clicked", { hasShareAPI: !!navigator.share });
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my family on ChoreGami!",
          text: "ChoreGami makes family chores fun with points and rewards. Join us!",
          url: shareUrl,
        });
        console.log("[Referral] Share completed");
      } catch (err) {
        console.log("[Referral] Share cancelled or failed", err);
      }
    } else {
      console.log("[Referral] No Web Share API, falling back to copy");
      handleCopy();
    }
  };

  return (
    <div class="settings-card" id="share-referral-section">
      <div class="settings-card-header">
        <span class="settings-card-icon">🎁</span>
        <h3>Share ChoreGami</h3>
      </div>

      <p class="referral-tagline">
        Tell a friend. Get 1 free month when they join.
      </p>
      <p class="referral-social-proof">
        Most families discover ChoreGami through friends.
      </p>

      <div class="referral-link-section">
        <label class="referral-label">Your referral link</label>
        <div class="referral-link-row">
          <input
            type="text"
            value={shareUrl}
            readOnly
            class="referral-link-input"
          />
          <button
            onClick={handleCopy}
            class="referral-btn"
            title="Copy to clipboard"
          >
            {copied.value ? "✓" : "📋"}
          </button>
          <button
            onClick={handleShare}
            class="referral-btn"
            title="Share"
          >
            📤
          </button>
        </div>
      </div>

      <div class="referral-stats">
        {conversions > 0 ? (
          <span class="referral-stat-earned">
            🎉 {conversions} friend{conversions > 1 ? "s" : ""} joined — {monthsEarned} of 6 free months unlocked
          </span>
        ) : (
          <span class="referral-stat-zero">
            🎉 Share to unlock up to 6 free months
          </span>
        )}
      </div>

      <div class="referral-terms">
        ⓘ Free months apply to future billing (up to 6).
      </div>

      <style>{`
        .referral-tagline {
          margin: 0 0 4px 0;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .referral-social-proof {
          margin: 0 0 16px 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .referral-link-section {
          margin-bottom: 16px;
        }
        .referral-label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .referral-link-row {
          display: flex;
          gap: 8px;
        }
        .referral-link-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.9rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .referral-btn {
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }
        .referral-btn:hover {
          background: var(--bg-secondary);
        }
        .referral-btn:active {
          transform: scale(0.95);
        }
        .referral-stats {
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
          text-align: center;
        }
        .referral-stat-earned {
          color: var(--color-success, #22c55e);
          font-weight: 500;
        }
        .referral-stat-zero {
          color: var(--text-secondary);
        }
        .referral-terms {
          margin-top: 12px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
