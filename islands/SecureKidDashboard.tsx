/**
 * Secure Kid Dashboard Component (Client-Side Active Kid Loading)
 * Based on original repo's simple session pattern - under 200 lines
 */

import { useEffect, useState } from "preact/hooks";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";
import KidDashboard from "./KidDashboard.tsx";
import WebSocketManager from "./WebSocketManager.tsx";

interface GoalStatus {
  enabled: boolean;
  target: number;
  progress: number;
  bonus: number;
  achieved: boolean;
}

interface Props {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  goalStatus?: GoalStatus | null;
}

export default function SecureKidDashboard({ family, familyMembers, recentActivity, goalStatus }: Props) {
  const [activeKid, setActiveKid] = useState<any>(null);
  const [todaysChores, setTodaysChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // SECURITY: Clear parent session when kid dashboard is accessed
    // This ensures parent must re-enter PIN when switching back to parent features
    clearParentSessionOnKidDashboardAccess();
    
    loadActiveKid();
  }, [familyMembers]);

  const clearParentSessionOnKidDashboardAccess = async () => {
    try {
      const { clearParentSessionOnKidAccess } = await import("../lib/auth/parent-session.ts");
      clearParentSessionOnKidAccess("kid dashboard accessed");
    } catch (error) {
      console.error("Failed to clear parent session on kid dashboard access:", error);
    }
  };

  // Handle real-time points updates via WebSocketManager
  const handleLeaderboardUpdate = (leaderboard: any[]) => {
    if (!activeKid) return;
    
    console.log('🏆 Live points update for kid:', leaderboard);
    
    // Update active kid's points if they're in the leaderboard update
    const kidUpdate = leaderboard.find(p => p.user_id === activeKid.id);
    if (kidUpdate) {
      setActiveKid((current: any) => ({
        ...current,
        current_points: kidUpdate.points
      }));
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === "leaderboard_update") {
      setWsConnected(true);
    } else if (message.type === "feature_disabled" || message.type === "fallback_mode") {
      setWsConnected(false);
    }
  };

  const loadActiveKid = async () => {
    try {
      // Get active kid from session
      const activeKidId = ActiveKidSessionManager.getActiveKidId();
      
      if (!activeKidId) {
        // No active kid - redirect to selector
        window.location.href = "/";
        return;
      }

      // Find kid in family members
      const kid = familyMembers.find(member => member.id === activeKidId);
      if (!kid) {
        // Kid not in family - clear session and redirect
        ActiveKidSessionManager.clearActiveKid();
        window.location.href = "/";
        return;
      }

      setActiveKid(kid);
      
      // Load kid's chores
      await loadKidChores(activeKidId);
      
    } catch (err) {
      console.error("Error loading active kid:", err);
      setError("Failed to load kid information");
    } finally {
      setLoading(false);
    }
  };

  const loadKidChores = async (kidId: string) => {
    try {
      // Get local date in YYYY-MM-DD format (avoids UTC timezone issues)
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Secure API call - kid ID in request body, not URL
      const response = await fetch('/api/kids/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kidId, localDate }),
      });
      
      if (response.ok) {
        const chores = await response.json();
        setTodaysChores(chores);
      } else {
        console.error("Failed to load chores");
        setTodaysChores([]);
      }
    } catch (err) {
      console.error("Error loading chores:", err);
      setTodaysChores([]);
    }
  };

  if (loading) {
    return (
      <div class="container">
        <div style={{ 
          textAlign: "center", 
          padding: "3rem",
          color: "var(--color-text-light)" 
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !activeKid) {
    return (
      <div class="container">
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-warning)" }}>
            {error || "No active kid session found"}
          </p>
          <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Kid Selection
          </a>
        </div>
      </div>
    );
  }

  return (
    <WebSocketManager 
      familyId={family.id}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      onMessage={handleWebSocketMessage}
    >
      {/* Header with kid info */}
      <div class="header">
        <div>
          <a href="/" style={{ color: "white", textDecoration: "none" }}>
            ← Switch Profile
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>👧</span>
          <span>{activeKid.name}</span>
          {family?.children_pins_enabled && (
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>🔐</span>
          )}
          <span style={{
            fontSize: "0.625rem",
            color: wsConnected ? "var(--color-success)" : "var(--color-text-light)",
            marginLeft: "0.25rem"
          }}>
            {wsConnected ? "🎮" : "📊"}
          </span>
        </div>
        <div>
          <a
            href="/parent/dashboard"
            style={{ color: "white", textDecoration: "none" }}
          >
            ≡
          </a>
        </div>
      </div>

      {/* Family Goal Progress - Motivational display for kids */}
      {goalStatus?.enabled && (
        <div class="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🎯</span>
            <span style={{ fontWeight: "600" }}>Family Goal This Week</span>
          </div>

          {/* Progress Header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            <span style={{ fontWeight: "500" }}>${goalStatus.progress} of ${goalStatus.target}</span>
            <span style={{ color: "var(--color-text-light)" }}>
              {Math.min(Math.round((goalStatus.progress / goalStatus.target) * 100), 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: "16px",
            background: "#e5e7eb",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min((goalStatus.progress / goalStatus.target) * 100, 100)}%`,
              background: goalStatus.achieved
                ? "var(--color-success)"
                : "var(--color-primary)",
              borderRadius: "8px",
              transition: "width 0.3s ease"
            }} />
          </div>

          {/* Motivational Message */}
          <p style={{
            textAlign: "center",
            marginTop: "0.75rem",
            marginBottom: "0",
            fontWeight: "500",
            fontSize: "0.9rem",
            color: goalStatus.achieved ? "var(--color-success)" : "var(--color-text)"
          }}>
            {goalStatus.achieved
              ? `🎉 Goal reached! Everyone gets +$${goalStatus.bonus}!`
              : `💪 $${goalStatus.target - goalStatus.progress} more together → everyone gets +$${goalStatus.bonus}!`
            }
          </p>
        </div>
      )}

      {/* Kid Dashboard */}
      <KidDashboard
        kid={activeKid}
        family={family}
        familyMembers={familyMembers}
        todaysChores={todaysChores}
        recentActivity={recentActivity}
        onChoreComplete={() => {
          // Refresh chores after completion to get updated data
          if (activeKid) {
            loadKidChores(activeKid.id);
          }
        }}
      />
    </WebSocketManager>
  );
}