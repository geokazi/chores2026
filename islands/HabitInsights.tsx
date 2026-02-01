/**
 * HabitInsights Island - Behavioral analytics visualization
 * Pure CSS bars (no chart library), template-aware metrics
 * Shows "Getting Started" view for new users (< 7 days of activity)
 */

interface WeekTrend {
  weekStart: string;
  activeDays: number;
  expectedDays: number;
  completions: number;
  pct: number;
}

interface KidTrend {
  profileId: string;
  name: string;
  weeks: WeekTrend[];
  overallPct: number;
  deltaFromPrev: number;
}

interface StreakData {
  profileId: string;
  name: string;
  currentStreak: number;
  consistencyPct: number;
  longestStreak: number;
  milestone: "none" | "building" | "strengthening" | "forming" | "formed";
}

interface RoutineData {
  profileId: string;
  name: string;
  morningCount: number;
  eveningCount: number;
  morningPct: number;
}

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

interface Props {
  trends: KidTrend[];
  streaks: StreakData[];
  routines: RoutineData[];
  totalActiveDays: number;
  thisWeekActivity: ThisWeekActivity[];
}

const MILESTONE_LABELS: Record<StreakData["milestone"], { label: string; icon: string }> = {
  none: { label: "Getting started", icon: "🌱" },
  building: { label: "Building (7+ days)", icon: "🔨" },
  strengthening: { label: "Strengthening (14+)", icon: "💪" },
  forming: { label: "Forming (21+)", icon: "🔥" },
  formed: { label: "Habit formed! (30+)", icon: "⭐" },
};

/** Encouraging message based on streak/activity */
function getEncouragement(streak: number, totalDone: number): string {
  if (streak >= 3) return `🔥 ${streak}-day streak — great momentum!`;
  if (streak === 2) return `🔥 ${streak}-day streak — keep it up!`;
  if (streak === 1) return "🌟 Nice start! One more day for a streak.";
  if (totalDone > 0) return "🌟 Off to a good start!";
  return "✨ Ready when you are!";
}

export default function HabitInsights({ trends, streaks, routines, totalActiveDays, thisWeekActivity }: Props) {
  const isNewUser = totalActiveDays < 7;

  // New user: show "Getting Started" view
  if (isNewUser) {
    return (
      <div class="habit-insights">
        <section class="getting-started-card">
          <div class="gs-header">
            <span class="gs-icon">🌱</span>
            <h2>Building Your Insights</h2>
          </div>
          <p class="gs-desc">
            Complete chores for 7 days to build enough data for meaningful trends:
          </p>
          <ul class="gs-features">
            <li class={totalActiveDays >= 7 ? "unlocked" : ""}>
              {totalActiveDays >= 7 ? "✓" : "○"} 12-week consistency trends
            </li>
            <li class={totalActiveDays >= 7 ? "unlocked" : ""}>
              {totalActiveDays >= 7 ? "✓" : "○"} Habit formation milestones
            </li>
            <li class={totalActiveDays >= 7 ? "unlocked" : ""}>
              {totalActiveDays >= 7 ? "✓" : "○"} Morning vs evening patterns
            </li>
          </ul>
          <div class="gs-progress">
            <div class="gs-progress-bar">
              <div
                class="gs-progress-fill"
                style={{ width: `${Math.min(100, (totalActiveDays / 7) * 100)}%` }}
              />
            </div>
            <span class="gs-progress-label">Day {totalActiveDays} of 7</span>
          </div>
        </section>

        <section class="insights-section">
          <h2>Last 7 Days</h2>
          <p class="section-desc">Day-by-day progress</p>
          <div class="this-week-cards">
            {thisWeekActivity.map(kid => {
              const kidStreak = streaks.find(s => s.profileId === kid.profileId);
              const encouragement = getEncouragement(kidStreak?.currentStreak || 0, kid.totalDone);
              return (
                <div class="this-week-card" key={kid.profileId}>
                  <div class="tw-header">
                    <span class="tw-name">{kid.name}</span>
                    <div class="tw-stats">
                      <span class="tw-points">+{kid.totalPoints} pts</span>
                      <span class="tw-days-count">{kid.totalDone}/7</span>
                    </div>
                  </div>
                  <div class="tw-days">
                    {kid.days.map(day => (
                      <div class={`tw-day ${day.done ? "done" : ""}`} key={day.date}>
                        <span class="tw-day-icon">{day.done ? day.points : "○"}</span>
                        <span class="tw-day-name">{day.dayName}</span>
                      </div>
                    ))}
                  </div>
                  <div class="tw-encouragement">{encouragement}</div>
                </div>
              );
            })}
          </div>
        </section>

        <style>{`
          .getting-started-card {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1px solid #a7f3d0;
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }
          .gs-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .gs-icon {
            font-size: 1.5rem;
          }
          .gs-header h2 {
            margin: 0;
            font-size: 1.1rem;
            color: #065f46;
          }
          .gs-desc {
            margin: 0 0 0.75rem;
            font-size: 0.875rem;
            color: #047857;
          }
          .gs-features {
            list-style: none;
            padding: 0;
            margin: 0 0 1rem;
          }
          .gs-features li {
            font-size: 0.875rem;
            color: #6b7280;
            padding: 0.25rem 0;
          }
          .gs-features li.unlocked {
            color: #059669;
          }
          .gs-progress {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }
          .gs-progress-bar {
            height: 8px;
            background: #d1fae5;
            border-radius: 4px;
            overflow: hidden;
          }
          .gs-progress-fill {
            height: 100%;
            background: #10b981;
            border-radius: 4px;
            transition: width 0.3s ease;
          }
          .gs-progress-label {
            font-size: 0.75rem;
            color: #065f46;
            font-weight: 500;
          }

          .this-week-cards {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .this-week-card {
            background: var(--color-card, #fff);
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 0.75rem 1rem;
          }
          .tw-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }
          .tw-name {
            font-weight: 600;
            font-size: 0.9rem;
          }
          .tw-stats {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }
          .tw-points {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--color-primary);
          }
          .tw-days-count {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--color-text-light);
            background: rgba(var(--color-primary-rgb), 0.08);
            padding: 0.1rem 0.35rem;
            border-radius: 4px;
          }
          .tw-days {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .tw-day {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            padding: 0.35rem 0;
            border-radius: 6px;
            background: #f9fafb;
          }
          .tw-day.done {
            background: #ecfdf5;
          }
          .tw-day-icon {
            font-size: 1rem;
            color: #d1d5db;
          }
          .tw-day.done .tw-day-icon {
            color: #10b981;
          }
          .tw-day-name {
            font-size: 0.6rem;
            color: #9ca3af;
            text-transform: uppercase;
          }
          .tw-encouragement {
            font-size: 0.8rem;
            color: #6b7280;
          }

          .habit-insights {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .insights-section h2 {
            font-size: 1.1rem;
            margin: 0 0 0.25rem;
            color: var(--color-text, #064e3b);
          }
          .section-desc {
            font-size: 0.75rem;
            color: #888;
            margin: 0 0 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  // Established user: show full 12-week view
  return (
    <div class="habit-insights">
      {/* Section 1: 12-Week Consistency Trend */}
      <section class="insights-section">
        <h2>Consistency Trend</h2>
        <p class="section-desc">12-week completion rate vs expected days</p>
        {trends.map(kid => (
          <div class="kid-trend" key={kid.profileId}>
            <div class="kid-trend-header">
              <span class="kid-name">{kid.name}</span>
              <span class="kid-overall">
                {kid.overallPct}%
                {kid.deltaFromPrev !== 0 && (
                  <span class={kid.deltaFromPrev > 0 ? "delta-up" : "delta-down"}>
                    {kid.deltaFromPrev > 0 ? "+" : ""}{kid.deltaFromPrev}%
                  </span>
                )}
              </span>
            </div>
            <div class="week-bars">
              {kid.weeks.map((week, i) => (
                <div class="week-bar-col" key={i} title={`${week.weekStart}: ${week.pct}% (${week.activeDays}/${week.expectedDays} days)`}>
                  <div class="week-bar-track">
                    <div
                      class={`week-bar-fill ${week.pct >= 80 ? "bar-high" : week.pct >= 50 ? "bar-mid" : "bar-low"}`}
                      style={{ height: `${Math.max(week.pct, 4)}%` }}
                    />
                  </div>
                  {i === 0 && <span class="week-label">12w</span>}
                  {i === 11 && <span class="week-label">now</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Section 2: Streak Cards */}
      <section class="insights-section">
        <h2>Streaks</h2>
        <p class="section-desc">Current streak with 1-day recovery allowed</p>
        <div class="streak-cards">
          {streaks.map(kid => {
            const milestone = MILESTONE_LABELS[kid.milestone];
            return (
              <div class="streak-card" key={kid.profileId}>
                <div class="streak-card-top">
                  <span class="streak-name">{kid.name}</span>
                  <span class="streak-milestone">{milestone.icon} {milestone.label}</span>
                </div>
                <div class="streak-stats">
                  <div class="streak-stat">
                    <span class="stat-value">{kid.currentStreak}</span>
                    <span class="stat-label">current</span>
                  </div>
                  <div class="streak-stat">
                    <span class="stat-value">{kid.consistencyPct}%</span>
                    <span class="stat-label">30-day</span>
                  </div>
                  <div class="streak-stat">
                    <span class="stat-value">{kid.longestStreak}</span>
                    <span class="stat-label">longest</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Routine Breakdown */}
      <section class="insights-section">
        <h2>Routine Timing</h2>
        <p class="section-desc">Morning vs evening completions (30 days)</p>
        <div class="routine-cards">
          {routines.map(kid => {
            return (
              <div class="routine-card" key={kid.profileId}>
                <span class="routine-name">{kid.name}</span>
                <div class="routine-bar-wrap">
                  <div class="routine-bar">
                    <div class="routine-morning" style={{ width: `${kid.morningPct}%` }} />
                    <div class="routine-evening" style={{ width: `${100 - kid.morningPct}%` }} />
                  </div>
                  <div class="routine-labels">
                    <span>AM {kid.morningCount}</span>
                    <span>PM {kid.eveningCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .habit-insights {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .insights-section h2 {
          font-size: 1.1rem;
          margin: 0 0 0.25rem;
          color: var(--color-text, #064e3b);
        }
        .section-desc {
          font-size: 0.75rem;
          color: #888;
          margin: 0 0 0.75rem;
        }

        /* Trend bars */
        .kid-trend {
          margin-bottom: 1rem;
        }
        .kid-trend-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.4rem;
        }
        .kid-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .kid-overall {
          font-size: 0.85rem;
          color: #555;
        }
        .delta-up {
          color: #10b981;
          margin-left: 0.3rem;
          font-size: 0.75rem;
        }
        .delta-down {
          color: #ef4444;
          margin-left: 0.3rem;
          font-size: 0.75rem;
        }
        .week-bars {
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 60px;
        }
        .week-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          position: relative;
        }
        .week-bar-track {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          border-radius: 2px;
          background: #f1f5f9;
        }
        .week-bar-fill {
          width: 100%;
          border-radius: 2px;
          transition: height 0.3s ease;
        }
        .bar-high { background: #10b981; }
        .bar-mid { background: #f59e0b; }
        .bar-low { background: #ef4444; }
        .week-label {
          font-size: 0.6rem;
          color: #999;
          margin-top: 2px;
        }

        /* Streak cards */
        .streak-cards {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .streak-card {
          background: var(--color-card, #fff);
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.75rem 1rem;
        }
        .streak-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .streak-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .streak-milestone {
          font-size: 0.75rem;
          color: #666;
        }
        .streak-stats {
          display: flex;
          gap: 1.5rem;
        }
        .streak-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat-value {
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--color-primary, #10b981);
        }
        .stat-label {
          font-size: 0.65rem;
          color: #888;
          text-transform: uppercase;
        }

        /* Routine cards */
        .routine-cards {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .routine-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .routine-name {
          font-weight: 600;
          font-size: 0.85rem;
          min-width: 60px;
        }
        .routine-bar-wrap {
          flex: 1;
        }
        .routine-bar {
          display: flex;
          height: 14px;
          border-radius: 7px;
          overflow: hidden;
        }
        .routine-morning {
          background: #f59e0b;
        }
        .routine-evening {
          background: #6366f1;
        }
        .routine-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: #888;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
