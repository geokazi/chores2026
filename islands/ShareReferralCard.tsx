import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface WeeklyStats {
  choresCompleted: number;
  streakDays: number;
}

interface ShareReferralCardProps {
  code: string;
  conversions: number;
  monthsEarned: number;
  baseUrl: string;
  weeklyStats?: WeeklyStats | null;
}

/** Track feature interaction for analytics */
const trackFeature = (feature: string) => {
  fetch("/api/analytics/feature-demand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature }),
  }).catch(() => {}); // Non-blocking
};

// Threshold for showing personalized stats
const PERSONALIZED_THRESHOLD = 5;

export default function ShareReferralCard({ code, conversions, monthsEarned, baseUrl, weeklyStats }: ShareReferralCardProps) {
  const copied = useSignal(false);
  const shareUrl = `${baseUrl}/r/${code}`;

  // Show personalized version if >= 5 chores completed this week
  const isPersonalized = weeklyStats && weeklyStats.choresCompleted >= PERSONALIZED_THRESHOLD;

  // Debug logging
  console.log("[Referral] ShareReferralCard mounted", {
    code, conversions, monthsEarned, shareUrl,
    weeklyStats, isPersonalized
  });

  // Track card view on mount (once per session)
  useEffect(() => {
    const viewedKey = "referral_card_viewed";
    if (!sessionStorage.getItem(viewedKey)) {
      trackFeature(isPersonalized ? "referral_card_view_personalized" : "referral_card_view_simple");
      sessionStorage.setItem(viewedKey, "1");
    }
  }, [isPersonalized]);

  const handleCopy = async () => {
    console.log("[Referral] Copy clicked", { shareUrl, isPersonalized });
    trackFeature(isPersonalized ? "referral_copy_personalized" : "referral_copy_simple");
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

  // Generate share message based on stats
  const getShareMessage = () => {
    if (isPersonalized && weeklyStats) {
      const { choresCompleted, streakDays } = weeklyStats;
      if (streakDays >= 3) {
        return `My family completed ${choresCompleted} chores this week with a ${streakDays}-day streak! ChoreGami actually works.`;
      }
      return `My family completed ${choresCompleted} chores this week! ChoreGami actually works.`;
    }
    return "ChoreGami helps families stay organized with chores, events, and more. Check it out!";
  };

  const handleShare = async () => {
    console.log("[Referral] Share clicked", { hasShareAPI: !!navigator.share, isPersonalized });
    trackFeature(isPersonalized ? "referral_share_personalized" : "referral_share_simple");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my family on ChoreGami!",
          text: getShareMessage(),
          url: shareUrl,
        });
        console.log("[Referral] Share completed");
        trackFeature(isPersonalized ? "referral_share_complete_personalized" : "referral_share_complete_simple");
      } catch (err) {
        console.log("[Referral] Share cancelled or failed", err);
      }
    } else {
      console.log("[Referral] No Web Share API, falling back to copy");
      handleCopy();
    }
  };

  // Progress percentage for the bar
  const progressPercent = Math.min((monthsEarned / 6) * 100, 100);

  return (
    <div class="share-card" id="share-referral-section">
      <h3 class="referral-title">Share ChoreGami</h3>
      <p class="referral-tagline">
        Tell a friend. Get 1 free month when they join.
      </p>

      {/* Stats badge - only shown when personalized (>= 5 chores this week) */}
      {isPersonalized && weeklyStats && (
        <div class="referral-stats-badge">
          <span>🎉 {weeklyStats.choresCompleted} chores this week</span>
          {weeklyStats.streakDays >= 3 && (
            <span> • 🔥 {weeklyStats.streakDays}-day streak</span>
          )}
        </div>
      )}

      <div class="referral-link-section">
        <label class="referral-label">Your referral link</label>
        <input
          type="text"
          value={shareUrl}
          readOnly
          class="referral-link-input"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <div class="referral-actions">
          <button onClick={handleCopy} class={`referral-btn referral-btn-copy ${copied.value ? 'copied' : ''}`}>
            {copied.value ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button onClick={handleShare} class="referral-btn referral-btn-share">
            📤 Share
          </button>
        </div>
      </div>

      {/* Progress section with bar */}
      <div class="referral-progress-section">
        <div class="referral-progress-header">
          <span class="referral-progress-label">
            {conversions > 0 ? `🎉 ${monthsEarned}/6 free months` : "Earn up to 6 free months"}
          </span>
        </div>
        <div class="referral-progress-bar">
          <div
            class="referral-progress-fill"
            style={`width: ${progressPercent}%`}
          />
        </div>
        {conversions > 0 && monthsEarned < 6 && (
          <p class="referral-progress-hint">
            {6 - monthsEarned} more to unlock all rewards!
          </p>
        )}
      </div>

      <style>{`
        /* Modern glass card */
        .share-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.06),
            0 1px 2px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          padding: 24px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .share-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 2px 4px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        /* Typography */
        .referral-title {
          margin: 0 0 6px 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.02em;
        }
        .referral-tagline {
          margin: 0 0 20px 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        /* Stats badge */
        .referral-stats-badge {
          background: linear-gradient(
            135deg,
            rgba(var(--color-primary-rgb, 16, 185, 129), 0.12) 0%,
            rgba(var(--color-primary-rgb, 16, 185, 129), 0.06) 100%
          );
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-primary);
          text-align: center;
        }

        /* Link section */
        .referral-link-section {
          margin-bottom: 20px;
        }
        .referral-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .referral-link-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.2);
          border-radius: 12px;
          font-size: 0.875rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.04);
          color: var(--color-text);
          margin-bottom: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .referral-link-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
        }

        /* Action buttons */
        .referral-actions {
          display: flex;
          gap: 12px;
        }
        .referral-btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .referral-btn:active {
          transform: scale(0.97);
        }

        /* Copy button */
        .referral-btn-copy {
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
          color: var(--color-primary);
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.3);
        }
        .referral-btn-copy:hover {
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
        }
        .referral-btn-copy.copied {
          background: var(--color-primary);
          color: white;
          border-color: transparent;
        }

        /* Share button - gradient */
        .referral-btn-share {
          background: linear-gradient(
            135deg,
            var(--color-primary) 0%,
            var(--color-primary-dark, var(--color-primary)) 100%
          );
          color: white;
          box-shadow: 0 2px 8px rgba(var(--color-primary-rgb, 16, 185, 129), 0.3);
        }
        .referral-btn-share:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(var(--color-primary-rgb, 16, 185, 129), 0.4);
        }

        /* Progress section */
        .referral-progress-section {
          padding-top: 20px;
          border-top: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
        }
        .referral-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .referral-progress-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text);
        }

        /* Progress bar */
        .referral-progress-bar {
          height: 10px;
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
          border-radius: 5px;
          overflow: hidden;
          position: relative;
        }
        .referral-progress-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            var(--color-primary) 0%,
            var(--color-primary-dark, var(--color-primary)) 100%
          );
          border-radius: 5px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          min-width: ${conversions > 0 ? '8%' : '0'};
        }
        /* Shimmer effect */
        .referral-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .referral-progress-hint {
          margin: 10px 0 0 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-align: center;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .share-card,
          .referral-btn,
          .referral-link-input,
          .referral-progress-fill {
            transition: none;
          }
          .referral-progress-fill::after {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
