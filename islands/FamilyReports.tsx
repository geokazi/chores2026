/**
 * Family Reports Island
 * Savings-focused layout with zero clicks needed to see all data
 */

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  savings: number;
  savings_dollars: number;
  earned_week: number;
  earned_month: number;
  earned_ytd: number;
  earned_all_time: number;
}

interface GoalsAchievedData {
  byPerson: Array<{
    name: string;
    totalPoints: number;
    rewardCount: number;
  }>;
  familyTotal: {
    totalPoints: number;
    rewardCount: number;
  };
}

interface GoalStatus {
  enabled: boolean;
  target: number;
  progress: number;
  bonus: number;
  achieved: boolean;
}

interface WeeklyPatterns {
  familyBusiestDay: { day: string; count: number } | null;
  familySlowestDays: string[];
  byPerson: Array<{
    name: string;
    total: number;
    topDays: string[];
    heatmap: number[];
  }>;
}

interface FamilyReportsProps {
  analytics: {
    members: FamilyMember[];
    totals: {
      earned_week: number;
      earned_month: number;
      earned_ytd: number;
      earned_all_time: number;
    };
  };
  goalsAchieved: GoalsAchievedData;
  pointsPerDollar: number;
  goalStatus?: GoalStatus | null;
  weeklyPatterns?: WeeklyPatterns | null;
  pointsOnlyMode?: boolean;
}

export default function FamilyReports({ analytics, goalsAchieved, pointsPerDollar, goalStatus, weeklyPatterns, pointsOnlyMode = false }: FamilyReportsProps) {
  const { members, totals } = analytics;

  // Detect "new period" situations for helpful context
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const isFirstOfMonth = today.getDate() === 1;
  const isJan1 = today.getMonth() === 0 && today.getDate() === 1;

  // Only show note when it's day 1 AND totals are actually zero
  const showWeekNote = isSunday && totals.earned_week === 0;
  const showMonthNote = isFirstOfMonth && totals.earned_month === 0;
  const showYearNote = isJan1 && totals.earned_ytd === 0;

  // Build contextual note
  let periodNote = "";
  if (showYearNote) {
    periodNote = "Happy New Year! Fresh start for everyone.";
  } else if (showWeekNote && showMonthNote) {
    periodNote = "New week and month just started.";
  } else if (showMonthNote) {
    periodNote = "New month just started.";
  } else if (showWeekNote) {
    periodNote = "New week just started.";
  }

  // Find top saver (highest savings)
  const topSaver = members.length > 0
    ? members.reduce((top, m) => m.savings > top.savings ? m : top, members[0])
    : null;

  // Find weekly champion (highest earned this week)
  const weeklyChampion = members.length > 0
    ? members.reduce((top, m) => m.earned_week > top.earned_week ? m : top, members[0])
    : null;

  // Find top goal achiever
  const topAchiever = goalsAchieved.byPerson.length > 0 ? goalsAchieved.byPerson[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Family Goal Progress Section */}
      {goalStatus?.enabled && (
        <div class="card" style={{ marginBottom: "0" }}>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🎯</span> Family Goal This Week
          </h2>

          {/* Progress Header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "500" }}>
              {pointsOnlyMode
                ? `${goalStatus.progress} of ${goalStatus.target} pts`
                : `$${goalStatus.progress} of $${goalStatus.target}`
              }
            </span>
            <span style={{ color: "var(--color-text-light)" }}>
              {Math.min(Math.round((goalStatus.progress / goalStatus.target) * 100), 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: "20px",
            background: "#e5e7eb",
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min((goalStatus.progress / goalStatus.target) * 100, 100)}%`,
              background: goalStatus.achieved
                ? "var(--color-success)"
                : "var(--color-primary)",
              borderRadius: "10px",
              transition: "width 0.3s ease"
            }} />
          </div>

          {/* Message */}
          <p style={{
            textAlign: "center",
            marginTop: "0.75rem",
            marginBottom: "0",
            fontWeight: "500",
            color: goalStatus.achieved ? "var(--color-success)" : "var(--color-text)"
          }}>
            {goalStatus.achieved
              ? pointsOnlyMode
                ? `🎉 Goal reached! Everyone gets +${goalStatus.bonus} pts!`
                : `🎉 Goal reached! Everyone gets +$${goalStatus.bonus}!`
              : pointsOnlyMode
                ? `💪 ${goalStatus.target - goalStatus.progress} pts more together → everyone gets +${goalStatus.bonus} pts!`
                : `💪 $${goalStatus.target - goalStatus.progress} more together → everyone gets +$${goalStatus.bonus}!`
            }
          </p>
        </div>
      )}

      {/* Savings Section */}
      <div class="card">
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>💰</span> Savings
        </h2>

        {members.length === 0 ? (
          <p style={{ color: "var(--color-text-light)", textAlign: "center" }}>
            No family members found
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--color-border, #eee)",
                }}
              >
                <span style={{ fontWeight: "500" }}>{member.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {topSaver && member.id === topSaver.id && member.savings > 0 && (
                    <span title="Top Saver" style={{ fontSize: "1rem" }}>⭐</span>
                  )}
                  <span style={{ fontFamily: "monospace", minWidth: "70px", textAlign: "right" }}>
                    {member.savings} pts
                  </span>
                  {!pointsOnlyMode && (
                    <span style={{ color: "var(--color-success)", fontFamily: "monospace", minWidth: "70px", textAlign: "right" }}>
                      (${member.savings_dollars.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Earned Section */}
      <div class="card">
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>📈</span> Earned This
        </h2>

        {/* Period Headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr repeat(4, 60px)",
          gap: "0.5rem",
          padding: "0.5rem 0",
          borderBottom: "2px solid var(--color-border, #eee)",
          fontWeight: "600",
          fontSize: "0.8rem",
          color: "var(--color-text-light)",
        }}>
          <span></span>
          <span style={{ textAlign: "right" }}>Week</span>
          <span style={{ textAlign: "right" }}>Month</span>
          <span style={{ textAlign: "right" }}>Year</span>
          <span style={{ textAlign: "right" }}>All Time</span>
        </div>

        {/* Member Rows */}
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr repeat(4, 60px)",
              gap: "0.5rem",
              padding: "0.5rem 0",
              borderBottom: "1px solid var(--color-border, #eee)",
            }}
          >
            <span style={{ fontWeight: "500" }}>{member.name}</span>
            <span style={{ textAlign: "right", fontFamily: "monospace" }}>{member.earned_week}</span>
            <span style={{ textAlign: "right", fontFamily: "monospace" }}>{member.earned_month}</span>
            <span style={{ textAlign: "right", fontFamily: "monospace" }}>{member.earned_ytd}</span>
            <span style={{ textAlign: "right", fontFamily: "monospace" }}>{member.earned_all_time}</span>
          </div>
        ))}

        {/* Family Totals */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr repeat(4, 60px)",
          gap: "0.5rem",
          padding: "0.75rem 0 0.5rem 0",
          fontWeight: "600",
          color: "var(--color-primary)",
        }}>
          <span>Family Total</span>
          <span style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.earned_week}</span>
          <span style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.earned_month}</span>
          <span style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.earned_ytd}</span>
          <span style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.earned_all_time}</span>
        </div>

        {/* Contextual note for new periods */}
        {periodNote && (
          <p style={{
            margin: "0.5rem 0 0 0",
            padding: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--color-text-light)",
            background: "var(--color-bg, #f8f9fa)",
            borderRadius: "6px",
            textAlign: "center",
          }}>
            {periodNote}
          </p>
        )}
      </div>

      {/* Goals Achieved Section - Card Layout by Person */}
      {goalsAchieved.byPerson.length > 0 && (
        <div class="card">
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🎯</span> Goals Achieved
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)", fontWeight: "normal" }}>
              (Past Year)
            </span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {goalsAchieved.byPerson.map((person) => (
              <div
                key={person.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  background: "var(--color-bg, #f8f9fa)",
                  borderRadius: "8px",
                  border: topAchiever?.name === person.name ? "2px solid var(--color-primary)" : "1px solid var(--color-border, #eee)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {topAchiever?.name === person.name && (
                    <span title="Top Achiever">🏅</span>
                  )}
                  <span style={{ fontWeight: "500" }}>{person.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "600", fontFamily: "monospace" }}>
                    {person.totalPoints} pts{!pointsOnlyMode && ` ($${(person.totalPoints / pointsPerDollar).toFixed(0)})`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-light)" }}>
                    {person.rewardCount} reward{person.rewardCount !== 1 ? "s" : ""} earned
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Family Total */}
          <div style={{
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: "2px solid var(--color-border, #eee)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "600",
            color: "var(--color-primary)",
          }}>
            <span>Family Total</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace" }}>
                {goalsAchieved.familyTotal.totalPoints} pts{!pointsOnlyMode && ` ($${(goalsAchieved.familyTotal.totalPoints / pointsPerDollar).toFixed(0)})`}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-light)" }}>
                {goalsAchieved.familyTotal.rewardCount} rewards earned
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Patterns Section */}
      {weeklyPatterns && weeklyPatterns.byPerson.length > 0 && (
        <div class="card">
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📅</span> Weekly Patterns
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)", fontWeight: "normal" }}>
              (Last 60 Days)
            </span>
          </h2>

          {/* Family Insights */}
          <div style={{ marginBottom: "1rem" }}>
            {weeklyPatterns.familyBusiestDay && (
              <p style={{ margin: "0 0 0.25rem 0" }}>
                🔥 Family's busiest day: <strong>{weeklyPatterns.familyBusiestDay.day}</strong> ({weeklyPatterns.familyBusiestDay.count} chores)
              </p>
            )}
            {weeklyPatterns.familySlowestDays.length > 0 && (
              <p style={{ margin: "0", color: "var(--color-text-light)" }}>
                😴 Slowest days: {weeklyPatterns.familySlowestDays.join(" & ")}
              </p>
            )}
          </div>

          {/* Per-Kid Summaries */}
          <div style={{ marginBottom: "1rem" }}>
            {weeklyPatterns.byPerson.map((person) => (
              <p key={person.name} style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>
                <strong>{person.name}</strong>: {person.total < 5 ? "Occasional" : `Most active ${person.topDays.join(" & ")}`} ({person.total} total)
              </p>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
            {/* Day Headers */}
            <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", gap: "0.25rem", marginBottom: "0.5rem" }}>
              <span></span>
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <span key={i} style={{ textAlign: "center", color: "var(--color-text-light)", fontWeight: "600" }}>{day}</span>
              ))}
            </div>

            {/* Person Rows */}
            {weeklyPatterns.byPerson.map((person) => (
              <div key={person.name} style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</span>
                {person.heatmap.map((count, dayIndex) => (
                  <span key={dayIndex} style={{ textAlign: "center" }}>
                    {count === 0 ? "·" : count <= 2 ? "█" : count <= 4 ? "██" : "███"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Champion */}
      {weeklyChampion && weeklyChampion.earned_week > 0 && (
        <div style={{
          textAlign: "center",
          padding: "1rem",
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
          borderRadius: "12px",
          color: "white",
        }}>
          <span style={{ fontSize: "1.5rem" }}>🏆</span>
          <p style={{ margin: "0.5rem 0 0 0", fontWeight: "600" }}>
            {weeklyChampion.name} is this week's Top Earner!
          </p>
        </div>
      )}
    </div>
  );
}
