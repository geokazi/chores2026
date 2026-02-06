import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import EmailInviteForm from "./EmailInviteForm.tsx";

interface WeeklyStats {
  choresCompleted: number;
  streakDays: number;
  eventsPlanned: number;
}

interface ShareReferralCardProps {
  code: string;
  conversions: number;
  monthsEarned: number;
  baseUrl: string;
  weeklyStats?: WeeklyStats | null;
  familyName?: string;
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

export default function ShareReferralCard({ code, conversions, monthsEarned, baseUrl, weeklyStats, familyName }: ShareReferralCardProps) {
  const copied = useSignal(false);
  const showEmailForm = useSignal(false);
  const shareUrl = `${baseUrl}/r/${code}`;

  // Show personalized version if >= 5 chores completed this week
  const isPersonalized = weeklyStats && weeklyStats.choresCompleted >= PERSONALIZED_THRESHOLD;


  // Track card view on mount (once per session)
  useEffect(() => {
    const viewedKey = "referral_card_viewed";
    if (!sessionStorage.getItem(viewedKey)) {
      trackFeature(isPersonalized ? "referral_card_view_personalized" : "referral_card_view_simple");
      sessionStorage.setItem(viewedKey, "1");
    }
  }, [isPersonalized]);

  const handleCopy = async () => {
    trackFeature(isPersonalized ? "referral_copy_personalized" : "referral_copy_simple");
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2000);
    } catch {
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

  // Generate share message based on stats - peer-to-peer friendly, not promotional
  const getShareMessage = () => {
    if (isPersonalized && weeklyStats) {
      const { choresCompleted, streakDays, eventsPlanned } = weeklyStats;

      // Pick the most impressive stat to highlight
      if (streakDays >= 5) {
        return `We've been using ChoreGami for ${streakDays} days straight and the kids actually do their chores now. Wild, I know.`;
      }
      if (eventsPlanned > 0 && choresCompleted >= 10) {
        return `Finally stopped juggling apps. ${choresCompleted} chores done this week, ${eventsPlanned} family events planned—one place for everything.`;
      }
      if (choresCompleted >= 10) {
        return `${choresCompleted} chores completed this week. Our family actually uses this app together. Thought you might like it.`;
      }
      if (eventsPlanned > 0) {
        return `We track chores and family events in one app now. ${eventsPlanned} events planned so far. Works surprisingly well.`;
      }
      return `${choresCompleted} chores this week—we're actually using it. Thought of you.`;
    }
    // Generic peer-to-peer message
    return "We stopped juggling apps. Chores, points, family events—one shared place. Works for real families.";
  };

  const handleShare = async () => {
    trackFeature(isPersonalized ? "referral_share_personalized" : "referral_share_simple");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ChoreGami",
          text: getShareMessage(),
          url: shareUrl,
        });
        trackFeature(isPersonalized ? "referral_share_complete_personalized" : "referral_share_complete_simple");
      } catch {
        // User cancelled or share failed - no action needed
      }
    } else {
      handleCopy();
    }
  };

  // Toggle email form
  const handleEmail = () => {
    trackFeature("referral_email_form_open");
    showEmailForm.value = !showEmailForm.value;
  };

  // Progress percentage for the bar
  const progressPercent = Math.min((monthsEarned / 6) * 100, 100);

  return (
    <div class="share-card" id="share-referral-section">
      <p class="share-intro">
        We've been using <strong>ChoreGami</strong> to manage chores and family plans in one shared place—and it's made a real difference.
      </p>
      <p class="share-incentive">
        If they join, you'll both get <strong>1 free month</strong> 🎉
      </p>

      {/* Stats badge - quiet credibility, only shown when meaningful */}
      {weeklyStats && (weeklyStats.choresCompleted > 0 || weeklyStats.eventsPlanned > 0) && (
        <div class="stats-badge">
          <span class="stats-label">This week:</span>
          <span class="stats-items">
            {weeklyStats.choresCompleted > 0 && (
              <span>🎉 {weeklyStats.choresCompleted} chores</span>
            )}
            {weeklyStats.streakDays >= 3 && (
              <span> • 🔥 {weeklyStats.streakDays}-day streak</span>
            )}
            {weeklyStats.eventsPlanned > 0 && (
              <span> • 📅 {weeklyStats.eventsPlanned} event{weeklyStats.eventsPlanned !== 1 ? "s" : ""}</span>
            )}
          </span>
        </div>
      )}

      <div class="referral-link-section">
        <label class="referral-label">Your personal invite link</label>
        <input
          type="text"
          value={shareUrl}
          readOnly
          class="referral-link-input"
          aria-label="Your personal invite link"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <div class="referral-actions">
          <button type="button" onClick={handleCopy} class={`referral-btn referral-btn-secondary ${copied.value ? 'copied' : ''}`}>
            {copied.value ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button type="button" onClick={handleEmail} class={`referral-btn referral-btn-secondary ${showEmailForm.value ? 'active' : ''}`}>
            📧 Email
          </button>
          <button type="button" onClick={handleShare} class="referral-btn referral-btn-share">
            📤 Share
          </button>
        </div>

        {/* Email form */}
        {showEmailForm.value && (
          <EmailInviteForm
            shareUrl={shareUrl}
            familyName={familyName || "A friend"}
            stats={weeklyStats}
            onClose={() => { showEmailForm.value = false; }}
          />
        )}
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
            style={`width: ${progressPercent}%; min-width: ${conversions > 0 ? '8%' : '0'}`}
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
        .share-intro {
          margin: 0 0 12px 0;
          font-size: 0.95rem;
          color: var(--color-text);
          line-height: 1.5;
        }
        .share-intro strong {
          color: var(--color-primary);
        }
        .share-incentive {
          margin: 0 0 20px 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .share-incentive strong {
          color: var(--color-text);
        }

        /* Stats badge - quiet credibility */
        .stats-badge {
          background: linear-gradient(
            135deg,
            rgba(var(--color-primary-rgb, 16, 185, 129), 0.08) 0%,
            rgba(var(--color-primary-rgb, 16, 185, 129), 0.04) 100%
          );
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 0.85rem;
          text-align: center;
        }
        .stats-label {
          font-weight: 600;
          color: var(--text-secondary);
          margin-right: 6px;
        }
        .stats-items {
          color: var(--color-text);
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

        /* Secondary buttons (Copy, Email) */
        .referral-btn-secondary {
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
          color: var(--color-primary);
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.3);
        }
        .referral-btn-secondary:hover {
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
        }
        .referral-btn-secondary.copied,
        .referral-btn-secondary.active {
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
