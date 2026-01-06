/**
 * Parent Dashboard Component
 * Family management and monitoring interface
 */

import { useState } from "preact/hooks";
import LiveLeaderboard from "./LiveLeaderboard.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";

interface Family {
  id: string;
  name: string;
  children_pins_enabled: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
}

interface ChoreAssignment {
  id: string;
  status: "pending" | "completed" | "verified" | "rejected";
  point_value: number;
  assigned_to_profile_id: string;
  chore_template?: {
    name: string;
    description?: string;
    icon?: string;
  };
  completed_at?: string;
}

interface Props {
  family: Family;
  members: FamilyMember[];
  chores: ChoreAssignment[];
  recentActivity: any[];
}

export default function ParentDashboard(
  { family, members, chores, recentActivity }: Props,
) {
  const [showPointAdjustment, setShowPointAdjustment] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null,
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const kids = members.filter((m) => m.role === "child");
  const pendingChores = chores.filter((c) => c.status === "pending");
  const completedChores = chores.filter((c) => c.status === "completed");

  const togglePinSetting = async () => {
    try {
      const response = await fetch(`/api/family/${family.id}/pin-setting`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          children_pins_enabled: !family.children_pins_enabled,
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error("Failed to update PIN setting");
      }
    } catch (error) {
      console.error("Error updating PIN setting:", error);
    }
  };

  const handlePointAdjustment = async () => {
    if (!selectedMember || !adjustmentAmount || !adjustmentReason) {
      return;
    }

    try {
      const response = await fetch(`/api/points/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: selectedMember.id,
          family_id: family.id,
          amount: parseInt(adjustmentAmount),
          reason: adjustmentReason,
        }),
      });

      if (response.ok) {
        setShowPointAdjustment(false);
        setSelectedMember(null);
        setAdjustmentAmount("");
        setAdjustmentReason("");
        window.location.reload();
      } else {
        console.error("Failed to adjust points");
      }
    } catch (error) {
      console.error("Error adjusting points:", error);
    }
  };

  return (
    <div>
      {/* Family Overview */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          {family.name} Overview
        </h2>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{kids.length}</span>
            <span class="stat-label">Kids</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{pendingChores.length}</span>
            <span class="stat-label">Pending</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{completedChores.length}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">
              {kids.reduce((sum, kid) => sum + kid.current_points, 0)}
            </span>
            <span class="stat-label">Total Points</span>
          </div>
        </div>
      </div>

      {/* PIN Settings */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Security Settings
        </h3>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
              Kid PIN Entry
            </div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-light)",
              }}
            >
              {family.children_pins_enabled
                ? "Kids must enter PIN to access their dashboard"
                : "Kids can access dashboard directly"}
            </div>
          </div>
          <button
            onClick={togglePinSetting}
            class={`btn ${
              family.children_pins_enabled ? "btn-secondary" : "btn-primary"
            }`}
            style={{ fontSize: "0.875rem" }}
          >
            {family.children_pins_enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Quick Actions
        </h3>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowPointAdjustment(true)}
            class="btn btn-secondary"
            style={{ fontSize: "0.875rem" }}
          >
            ⚡ Adjust Points
          </button>
          <a
            href={`/parent/${family.id}/chores`}
            class="btn btn-secondary"
            style={{ fontSize: "0.875rem", textDecoration: "none" }}
          >
            📝 Manage Chores
          </a>
          <a
            href={`/parent/${family.id}/reports`}
            class="btn btn-secondary"
            style={{ fontSize: "0.875rem", textDecoration: "none" }}
          >
            📊 View Reports
          </a>
        </div>
      </div>

      {/* Live Leaderboard */}
      {kids.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <LiveLeaderboard
            familyMembers={members}
            currentKidId=""
            familyId={family.id}
          />
        </div>
      )}

      {/* Recent Activity */}
      <LiveActivityFeed
        initialActivity={recentActivity}
        familyId={family.id}
      />

      {/* Point Adjustment Modal */}
      {showPointAdjustment && (
        <div
          class="modal-overlay"
          onClick={() => setShowPointAdjustment(false)}
        >
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "1rem",
              }}
            >
              Adjust Points
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Family Member:
              </label>
              <select
                value={selectedMember?.id || ""}
                onChange={(e) => {
                  const member = members.find((m) =>
                    m.id === e.currentTarget.value
                  );
                  setSelectedMember(member || null);
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                }}
              >
                <option value="">Select a family member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.current_points} pts)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Point Adjustment:
              </label>
              <input
                type="number"
                placeholder="Enter points (+ or -)"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.currentTarget.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Reason:
              </label>
              <input
                type="text"
                placeholder="Bonus points, correction, etc."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.currentTarget.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowPointAdjustment(false)}
                class="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handlePointAdjustment}
                disabled={!selectedMember || !adjustmentAmount ||
                  !adjustmentReason}
                class="btn btn-primary"
                style={{
                  flex: 1,
                  opacity:
                    (!selectedMember || !adjustmentAmount || !adjustmentReason)
                      ? 0.5
                      : 1,
                }}
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
