/**
 * TrialBanner - Shows trial status in header/dashboard
 * Non-blocking notification for trial expiration
 * ~100 lines
 */

interface TrialBannerProps {
  daysRemaining: number;
  isEnding: boolean; // Last 5 days
  isExpired: boolean;
  familyStats?: {
    choresCompleted: number;
  };
}

export default function TrialBanner({ daysRemaining, isEnding, isExpired, familyStats }: TrialBannerProps) {
  if (!isEnding && !isExpired && daysRemaining > 5) {
    // Subtle badge only - no banner needed
    return null;
  }

  const getMessage = () => {
    if (isExpired) {
      return {
        emoji: "⏰",
        title: "Your trial has ended",
        subtitle: familyStats
          ? `Your family completed ${familyStats.choresCompleted} chores! Keep the momentum going.`
          : "Subscribe to keep using ChoreGami.",
      };
    }

    if (daysRemaining === 1) {
      return {
        emoji: "⚡",
        title: "Last day of your trial!",
        subtitle: "Choose a plan to continue after today.",
      };
    }

    return {
      emoji: "⏳",
      title: `${daysRemaining} days left in your trial`,
      subtitle: familyStats
        ? `${familyStats.choresCompleted} chores completed so far!`
        : "Choose a plan to continue.",
    };
  };

  const { emoji, title, subtitle } = getMessage();

  return (
    <div class={`trial-banner ${isExpired ? "expired" : isEnding ? "ending" : ""}`}>
      <div class="trial-content">
        <span class="trial-emoji">{emoji}</span>
        <div class="trial-text">
          <strong class="trial-title">{title}</strong>
          <span class="trial-subtitle">{subtitle}</span>
        </div>
      </div>
      <div class="trial-actions">
        <a href="/pricing" class="trial-cta">Choose a Plan</a>
      </div>

      <style>{`
        .trial-banner {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .trial-banner.ending {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border-color: #d97706;
        }
        .trial-banner.expired {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-color: #ef4444;
        }
        .trial-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .trial-emoji {
          font-size: 1.75rem;
        }
        .trial-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .trial-title {
          color: #92400e;
          font-size: 0.95rem;
        }
        .trial-banner.expired .trial-title {
          color: #b91c1c;
        }
        .trial-subtitle {
          color: #a16207;
          font-size: 0.85rem;
        }
        .trial-banner.expired .trial-subtitle {
          color: #dc2626;
        }
        .trial-actions {
          display: flex;
          gap: 8px;
        }
        .trial-cta {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .trial-cta:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        @media (max-width: 480px) {
          .trial-banner {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .trial-content {
            flex-direction: column;
            gap: 8px;
          }
          .trial-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
