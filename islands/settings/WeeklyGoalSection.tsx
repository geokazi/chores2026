/**
 * WeeklyGoalSection - Family weekly goal configuration
 */

import { useState } from "preact/hooks";

interface WeeklyGoalSectionProps {
  settings: {
    weekly_goal?: number;
    goal_bonus?: number;
  };
  pointsOnlyMode?: boolean;
}

export default function WeeklyGoalSection({ settings, pointsOnlyMode = false }: WeeklyGoalSectionProps) {
  const [weeklyGoal, setWeeklyGoal] = useState<string>(
    settings?.weekly_goal?.toString() || ""
  );
  const [goalBonus, setGoalBonus] = useState<string>(
    settings?.goal_bonus?.toString() || "2"
  );
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const handleSaveGoal = async () => {
    setIsSavingGoal(true);
    try {
      const response = await fetch('/api/family/goal-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_goal: weeklyGoal ? parseInt(weeklyGoal) : null,
          goal_bonus: parseInt(goalBonus) || 2,
        }),
      });

      if (response.ok) {
        alert('✅ Goal settings saved!');
      } else {
        const result = await response.json();
        alert(`❌ Failed to save: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
    setIsSavingGoal(false);
  };

  return (
    <div class="settings-section">
      <h2>🎯 Weekly Family Goal</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
        Set a weekly earnings goal. When reached, everyone gets a bonus!
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ minWidth: "60px", fontWeight: "500" }}>Goal</label>
          {!pointsOnlyMode && <span>$</span>}
          <input
            type="number"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(e.currentTarget.value)}
            placeholder="20"
            min="1"
            max="1000"
            style={{
              width: "80px",
              padding: "0.5rem",
              borderRadius: "6px",
              border: "2px solid #e5e7eb",
              fontSize: "1rem"
            }}
          />
          <span style={{ color: "var(--color-text-light)" }}>{pointsOnlyMode ? "pts /week" : "/week"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ minWidth: "60px", fontWeight: "500" }}>Bonus</label>
          {!pointsOnlyMode && <span>$</span>}
          <input
            type="number"
            value={goalBonus}
            onChange={(e) => setGoalBonus(e.currentTarget.value)}
            placeholder="2"
            min="0"
            max="100"
            style={{
              width: "80px",
              padding: "0.5rem",
              borderRadius: "6px",
              border: "2px solid #e5e7eb",
              fontSize: "1rem"
            }}
          />
          <span style={{ color: "var(--color-text-light)" }}>{pointsOnlyMode ? "pts per person" : "per person"}</span>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--color-text-light)", margin: 0 }}>
          Leave goal blank to disable. When goal is reached, everyone gets the bonus!
        </p>

        <button
          class="btn btn-primary"
          style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
          onClick={handleSaveGoal}
          disabled={isSavingGoal}
        >
          {isSavingGoal ? 'Saving...' : 'Save Goal Settings'}
        </button>
      </div>
    </div>
  );
}
