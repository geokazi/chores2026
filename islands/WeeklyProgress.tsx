/**
 * WeeklyProgress Component
 * Shows day-by-day chore completion for the current week
 * Replaces static overview stats with actionable progress view
 */

interface ThisWeekDay {
  date: string;
  dayName: string;
  done: boolean;
  points: number;
}

interface ThisWeekActivity {
  profileId: string;
  name: string;
  days: ThisWeekDay[];
  totalDone: number;
  totalPoints: number;
}

interface StreakData {
  profileId: string;
  name: string;
  currentStreak: number;
}

interface Props {
  thisWeekActivity: ThisWeekActivity[];
  streaks: StreakData[];
  /** Single kid mode - hides header, shows just one card (for kid dashboard) */
  singleKid?: boolean;
  /** Make kid names clickable links to their dashboard (for parent view) */
  linkToKidDashboard?: boolean;
}

/** Encouraging message based on streak/activity */
function getEncouragement(streak: number, totalDone: number): string {
  if (streak >= 3) return `🔥 ${streak}-day streak — great momentum!`;
  if (streak === 2) return `🔥 ${streak}-day streak — keep it up!`;
  if (streak === 1) return "🌟 Nice start! One more day for a streak.";
  if (totalDone > 0) return "🌟 Off to a good start!";
  return "✨ Ready when you are!";
}

export default function WeeklyProgress({ thisWeekActivity, streaks, singleKid = false, linkToKidDashboard = false }: Props) {
  if (thisWeekActivity.length === 0) {
    return (
      <div class="weekly-progress-empty">
        <p>{singleKid ? "No activity yet this week." : "No kids in family yet. Add kids to see weekly progress."}</p>
      </div>
    );
  }

  return (
    <div class={`weekly-progress ${singleKid ? "single-kid" : ""}`}>
      {!singleKid && (
        <div class="weekly-progress-header">
          <h2>This Week</h2>
          <span class="weekly-progress-subtitle">Day-by-day progress</span>
        </div>
      )}

      <div class="weekly-progress-cards">
        {thisWeekActivity.map(kid => {
          const kidStreak = streaks.find(s => s.profileId === kid.profileId);
          const encouragement = getEncouragement(kidStreak?.currentStreak || 0, kid.totalDone);

          const nameElement = linkToKidDashboard ? (
            <a href="/kid/dashboard" class="wpc-name wpc-name-link" onClick={() => {
              // Set the active kid in session before navigating
              document.cookie = `active_kid_id=${kid.profileId};path=/;max-age=86400`;
            }}>{kid.name}</a>
          ) : (
            <span class="wpc-name">{kid.name}</span>
          );

          return (
            <div class="weekly-progress-card" key={kid.profileId}>
              <div class="wpc-header">
                {nameElement}
                <div class="wpc-stats">
                  <span class="wpc-points">+{kid.totalPoints} pts</span>
                  <span class="wpc-days-count">{kid.totalDone}/7</span>
                </div>
              </div>
              <div class="wpc-days">
                {kid.days.map(day => {
                  const now = new Date();
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isToday = day.date === today;
                  return (
                    <div class={`wpc-day ${day.done ? "done" : ""} ${isToday ? "today" : ""}`} key={day.date}>
                      <span class="wpc-day-icon">{day.done ? day.points : "○"}</span>
                      <span class="wpc-day-name">{day.dayName}</span>
                    </div>
                  );
                })}
              </div>
              <div class="wpc-encouragement">{encouragement}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        .weekly-progress {
          margin-bottom: 1.5rem;
        }

        .weekly-progress-header {
          margin-bottom: 0.75rem;
        }

        .weekly-progress-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0 0 0.125rem;
          color: var(--color-text);
        }

        .weekly-progress-subtitle {
          font-size: 0.75rem;
          color: var(--color-text-light);
        }

        .weekly-progress-cards {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .weekly-progress-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(var(--color-primary-rgb), 0.12);
          border-radius: 14px;
          padding: 1rem 1.125rem;
          transition: all 0.2s ease;
        }

        .weekly-progress-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.1);
        }

        .wpc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.625rem;
        }

        .wpc-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .wpc-name-link {
          text-decoration: none;
          color: var(--color-primary);
          transition: opacity 0.15s ease;
        }

        .wpc-name-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        /* Single kid mode - no outer margin, card is the container */
        .weekly-progress.single-kid {
          margin-bottom: 1rem;
        }

        .weekly-progress.single-kid .weekly-progress-cards {
          gap: 0;
        }

        .wpc-stats {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .wpc-points {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .wpc-days-count {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-light);
          background: rgba(var(--color-primary-rgb), 0.08);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }

        .wpc-days {
          display: flex;
          gap: 0.375rem;
          margin-bottom: 0.625rem;
        }

        .wpc-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          padding: 0.5rem 0.25rem;
          border-radius: 8px;
          background: rgba(var(--color-primary-rgb), 0.04);
          transition: all 0.15s ease;
        }

        .wpc-day.done {
          background: rgba(var(--color-primary-rgb), 0.12);
        }

        .wpc-day-icon {
          font-size: 1.1rem;
          color: rgba(var(--color-primary-rgb), 0.25);
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .wpc-day.done .wpc-day-icon {
          color: var(--color-primary);
        }

        .wpc-day.today {
          border: 2px solid var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.08);
        }

        .wpc-day.today .wpc-day-name {
          color: var(--color-primary);
          font-weight: 700;
        }

        .wpc-day-name {
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--color-text-light);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .wpc-encouragement {
          font-size: 0.8rem;
          color: var(--color-text-light);
          font-weight: 500;
        }

        .weekly-progress-empty {
          background: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          color: var(--color-text-light);
          font-size: 0.875rem;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .weekly-progress-card {
            transition: none;
          }
          .weekly-progress-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
