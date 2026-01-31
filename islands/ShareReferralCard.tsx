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

  return (
    <div class="settings-card" id="share-referral-section">
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
        />
        <div class="referral-actions">
          <button onClick={handleCopy} class="referral-btn referral-btn-copy">
            {copied.value ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button onClick={handleShare} class="referral-btn referral-btn-share">
            📤 Share
          </button>
        </div>
      </div>

      <div class="referral-footer">
        {conversions > 0 ? (
          <span class="referral-progress">
            🎉 {monthsEarned}/6 free months earned
          </span>
        ) : (
          <span class="referral-progress">
            Earn up to 6 free months
          </span>
        )}
      </div>

      <style>{`
        .referral-title {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .referral-tagline {
          margin: 0 0 16px 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .referral-stats-badge {
          background: linear-gradient(135deg, var(--color-bg) 0%, #ecfdf5 100%);
          border: 1px solid var(--color-primary);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-primary);
          text-align: center;
        }
        .referral-link-section {
          margin-bottom: 16px;
        }
        .referral-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .referral-link-input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.85rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .referral-actions {
          display: flex;
          gap: 10px;
        }
        .referral-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: transform 0.15s, opacity 0.15s;
        }
        .referral-btn:hover {
          opacity: 0.9;
        }
        .referral-btn:active {
          transform: scale(0.97);
        }
        .referral-btn-copy {
          background: var(--bg-secondary);
          color: var(--color-text);
          border: 1px solid var(--border-color);
        }
        .referral-btn-share {
          background: var(--color-primary);
          color: white;
        }
        .referral-footer {
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
          padding-top: 12px;
          border-top: 1px solid var(--color-bg);
        }
        .referral-progress {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
