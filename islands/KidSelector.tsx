/**
 * Kid Selector Island
 * Allows parent to select which kid is using the app
 * Handles PIN entry if enabled for the family
 */

import { useState, useEffect } from "preact/hooks";
import PinEntryModal from "./PinEntryModal.tsx";
import WebSocketManager from "./WebSocketManager.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
  pin_hash?: string;
}

interface Family {
  id: string;
  children_pins_enabled: boolean;
}

interface Props {
  family: Family;
  familyMembers: FamilyMember[];
}

export default function KidSelector({ family, familyMembers }: Props) {
  const [selectedKid, setSelectedKid] = useState<FamilyMember | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [liveMembers, setLiveMembers] = useState(familyMembers);
  const [wsConnected, setWsConnected] = useState(false);

  // Handle real-time points updates via WebSocketManager
  const handleLeaderboardUpdate = (leaderboard: any[]) => {
    console.log('🏆 Live points update for selector:', leaderboard);
    
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

  // Show all family members with live points updates
  const allMembers = liveMembers;

  const handleMemberSelect = async (member: FamilyMember) => {
    if (member.role === "parent") {
      try {
        // Set active parent in session (same pattern as kids)
        const { ActiveKidSessionManager } = await import("../lib/active-kid-session.ts");
        ActiveKidSessionManager.setActiveKid(member.id, member.name); // Reuse same function for parents
        // Parents go to their personal chore view
        window.location.href = `/parent/my-chores`;
      } catch (error) {
        console.error("Failed to set active parent:", error);
        // Fallback to family dashboard
        window.location.href = `/parent/dashboard`;
      }
    } else if (family.children_pins_enabled && member.role === "child") {
      // SECURITY: Clear parent session when switching to kid profile
      try {
        const { clearParentSessionOnKidAccess } = await import("../lib/auth/parent-session.ts");
        clearParentSessionOnKidAccess("switching to kid profile with PIN");
      } catch (error) {
        console.error("Failed to clear parent session:", error);
      }
      
      // Children with PIN enabled go through PIN entry
      setSelectedKid(member);
      setShowPinEntry(true);
    } else {
      // SECURITY: Clear parent session when switching to kid profile
      try {
        const { clearParentSessionOnKidAccess } = await import("../lib/auth/parent-session.ts");
        clearParentSessionOnKidAccess("switching to kid profile without PIN");
      } catch (error) {
        console.error("Failed to clear parent session:", error);
      }
      
      // Children without PIN go to secure kid dashboard (session-based)
      try {
        const { ActiveKidSessionManager } = await import("../lib/active-kid-session.ts");
        ActiveKidSessionManager.setActiveKid(member.id, member.name);
        window.location.href = `/kid/dashboard`;
      } catch (error) {
        console.error("Failed to set active kid:", error);
        // Error handling - stay on current page
        alert("Failed to set active kid. Please try again.");
      }
    }
  };

  const handlePinSuccess = async () => {
    if (selectedKid) {
      try {
        // Set active kid in session and redirect to secure dashboard
        const { ActiveKidSessionManager } = await import("../lib/active-kid-session.ts");
        ActiveKidSessionManager.setActiveKid(selectedKid.id, selectedKid.name);
        window.location.href = `/kid/dashboard`;
      } catch (error) {
        console.error("Failed to set active kid:", error);
        // Error handling - close PIN modal and stay on current page
        setShowPinEntry(false);
        alert("Failed to set active kid. Please try again.");
      }
    }
  };

  const handlePinCancel = () => {
    setSelectedKid(null);
    setShowPinEntry(false);
  };

  const calculateStreakEmoji = (points: number) => {
    if (points > 800) return "🔥5";
    if (points > 600) return "🔥4";
    if (points > 400) return "🔥3";
    if (points > 200) return "🔥2";
    if (points > 100) return "🔥1";
    return "";
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "👶";
  };

  // Sort all members by points for ranking
  const sortedMembers = [...allMembers].sort((a, b) =>
    b.current_points - a.current_points
  );

  return (
    <WebSocketManager 
      familyId={family.id}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      onMessage={handleWebSocketMessage}
    >
      {/* Connection Status */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "1rem",
        fontSize: "0.875rem",
        color: wsConnected ? "var(--color-success)" : "var(--color-text-light)"
      }}>
        {wsConnected ? "🎮 Live points updating" : "📊 Static points display"}
      </div>
      
      <div>
        {sortedMembers.map((member, index) => (
          <div
            key={member.id}
            class="card chore-card"
            onClick={() => handleMemberSelect(member)}
            style={{
              cursor: "pointer",
              marginBottom: "1rem",
              textAlign: "center",
              padding: "2rem 1.5rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
              {member.role === "parent" ? "👨‍💼" : getRankEmoji(index)}
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              {member.name}
              {member.role === "parent" && (
                <span style={{ fontSize: "0.875rem", marginLeft: "0.5rem", color: "var(--color-text-light)" }}>
                  (Parent)
                </span>
              )}
            </div>
            <div
              style={{
                color: "var(--color-primary)",
                fontWeight: "600",
                fontSize: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              {member.current_points} pts{" "}
              {calculateStreakEmoji(member.current_points)}
            </div>

            {family.children_pins_enabled && member.role === "child" && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-light)",
                  marginTop: "0.5rem",
                }}
              >
                [ Tap to Enter PIN ]
              </div>
            )}

            {(!family.children_pins_enabled && member.role === "child") || member.role === "parent" && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-success)",
                  marginTop: "0.5rem",
                }}
              >
                {member.role === "parent" ? "Tap for Family Dashboard →" : "Tap to enter →"}
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedMembers.length === 0 && (
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-text-light)" }}>
            No family members found.
          </p>
          <a
            href="/parent/settings"
            class="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Add Family Members
          </a>
        </div>
      )}

      {showPinEntry && selectedKid && (
        <PinEntryModal
          kid={selectedKid}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
    </WebSocketManager>
  );
}
