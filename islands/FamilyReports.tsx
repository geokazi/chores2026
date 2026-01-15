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
}

export default function FamilyReports({ analytics, goalsAchieved, pointsPerDollar }: FamilyReportsProps) {
  const { members, totals } = analytics;

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
                  <span style={{ color: "var(--color-success)", fontFamily: "monospace", minWidth: "70px", textAlign: "right" }}>
                    (${member.savings_dollars.toFixed(2)})
                  </span>
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
          <span style={{ textAlign: "right" }}>YTD</span>
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
                    {person.totalPoints} pts
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-light)" }}>
                    {person.rewardCount} reward{person.rewardCount !== 1 ? "s" : ""} claimed
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
              <span style={{ fontFamily: "monospace" }}>{goalsAchieved.familyTotal.totalPoints} pts</span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-light)", marginLeft: "0.5rem" }}>
                ({goalsAchieved.familyTotal.rewardCount} rewards)
              </span>
            </div>
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
