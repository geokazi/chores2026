/**
 * Parent Dashboard Component
 * Family management and monitoring interface
 */

import { useState, useEffect } from "preact/hooks";
import LiveLeaderboard from "./LiveLeaderboard.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";
import AddChoreModal from "./AddChoreModal.tsx";
import WebSocketManager from "./WebSocketManager.tsx";
import ParentPinGate from "./ParentPinGate.tsx";
import { getCurrentTheme, changeTheme, themes, type ThemeId } from "../lib/theme-manager.ts";

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
  const [showAddChore, setShowAddChore] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => getCurrentTheme());
  
  // 🎮 Real-time family leaderboard updates via WebSocketManager
  const [liveMembers, setLiveMembers] = useState(members);
  const [wsConnected, setWsConnected] = useState(false);

  // Apply theme on component mount
  useEffect(() => {
    changeTheme(selectedTheme);
  }, []);

  // Handle real-time leaderboard updates
  const handleLeaderboardUpdate = (leaderboard: any[]) => {
    console.log('🏆 Live leaderboard update:', leaderboard);
    
    // Update member points from FamilyScore real-time data
    setLiveMembers(current => 
      current.map(member => {
        const updated = leaderboard.find(p => p.user_id === member.id);
        return updated 
          ? { ...member, current_points: updated.points }
          : member;
      })
    );
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === "leaderboard_update") {
      setWsConnected(true);
    } else if (message.type === "feature_disabled" || message.type === "fallback_mode") {
      setWsConnected(false);
    }
  };

  const kids = liveMembers.filter((m) => m.role === "child");
  const pendingChores = chores.filter((c) => c.status === "pending");
  const completedChores = chores.filter((c) => c.status === "completed");


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

  const handleThemeChange = (themeId: ThemeId) => {
    console.log('🎨 Changing theme to:', themeId);
    setSelectedTheme(themeId);
    changeTheme(themeId);
    console.log('✅ Theme applied and saved:', themeId);
  };

  return (
    <WebSocketManager 
      familyId={family.id}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      onMessage={handleWebSocketMessage}
    >
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
            onClick={() => setShowAddChore(true)}
            class="btn btn-primary"
            style={{ fontSize: "0.875rem" }}
          >
            ➕ Add Chore
          </button>
          <ParentPinGate 
            operation="access family settings"
            familyMembers={liveMembers}
          >
            <a
              href="/parent/settings"
              class="btn btn-secondary"
              style={{ fontSize: "0.875rem", textDecoration: "none" }}
            >
              ⚙️ Settings
            </a>
          </ParentPinGate>
          <a
            href={`/parent/${family.id}/reports`}
            class="btn btn-secondary"
            style={{ fontSize: "0.875rem", textDecoration: "none" }}
          >
            📊 View Reports
          </a>
        </div>
      </div>

      {/* Theme Selector */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          🎨 App Theme
          <span style={{ 
            fontSize: "0.75rem", 
            color: "var(--color-text-light)",
            fontWeight: "400"
          }}>
            (Everyone can change this!)
          </span>
        </h3>
        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          flexWrap: "wrap" 
        }}>
          {themes.map((theme) => (
            <div 
              key={theme.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: selectedTheme === theme.id 
                  ? "2px solid var(--color-primary)" 
                  : "1px solid var(--color-border)",
                backgroundColor: selectedTheme === theme.id 
                  ? "var(--color-bg)" 
                  : "white",
                cursor: "pointer",
                transition: "all 0.2s ease",
                minWidth: "140px"
              }}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div 
                style={{ 
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: theme.color,
                  border: "2px solid rgba(0,0,0,0.1)"
                }}
              ></div>
              <span style={{ 
                fontSize: "0.875rem",
                fontWeight: selectedTheme === theme.id ? "600" : "400"
              }}>
                {theme.name}
              </span>
              {selectedTheme === theme.id && (
                <span style={{ color: "var(--color-success)", fontSize: "0.875rem" }}>✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Family Chores Overview */}
      {chores.length > 0 && (
        <div class="card" style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            All Family Chores
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {chores.slice(0, 5).map((chore: any) => {
              const assignedMember = members.find(m => m.id === chore.assigned_to_profile_id);
              const isParentChore = assignedMember?.role === "parent";
              
              return (
                <div
                  key={chore.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    backgroundColor: chore.status === "completed" ? "#f0f9ff" : "#f9fafb",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem"
                  }}
                >
                  <div>
                    <div>
                      <span style={{ fontSize: "1rem", marginRight: "0.5rem" }}>
                        {chore.chore_template?.icon || "📋"}
                      </span>
                      <strong>{chore.chore_template?.name}</strong>
                      <span style={{ color: "var(--color-text-light)", marginLeft: "0.5rem" }}>
                        → {assignedMember?.name}
                        {isParentChore && <span style={{ marginLeft: "0.25rem" }}>👨‍💼</span>}
                      </span>
                    </div>
                    {chore.due_date && (
                      <div style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-light)",
                        marginTop: "0.25rem",
                        marginLeft: "1.5rem"
                      }}>
                        📅 Due: {new Date(chore.due_date).toLocaleDateString()} at {new Date(chore.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: "0.75rem", 
                    color: chore.status === "completed" ? "var(--color-success)" : "var(--color-text-light)"
                  }}>
                    {chore.status === "completed" ? "✅" : `${chore.point_value} pts`}
                  </div>
                </div>
              );
            })}
          </div>
          
          {chores.length > 5 && (
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
                +{chores.length - 5} more chores
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Leaderboard */}
      {kids.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            marginBottom: "0.5rem" 
          }}>
            <span style={{ 
              fontSize: "0.875rem", 
              color: wsConnected ? "var(--color-success)" : "var(--color-text-light)" 
            }}>
              {wsConnected ? "🎮 Live updates" : "📊 Static view"}
            </span>
          </div>
          <LiveLeaderboard
            familyMembers={liveMembers}
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

      {/* Add Chore Modal */}
      <AddChoreModal
        isOpen={showAddChore}
        onClose={() => setShowAddChore(false)}
        familyMembers={members}
        onSuccess={() => {
          console.log("✅ Chore created successfully");
        }}
      />
      </div>
    </WebSocketManager>
  );
}
