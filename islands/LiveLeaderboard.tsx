/**
 * Live Leaderboard Component
 * Real-time family leaderboard with WebSocket updates
 */

import { useEffect, useState } from "preact/hooks";
import WebSocketManager from "./WebSocketManager.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  current_points: number;
}

interface Props {
  familyMembers: FamilyMember[];
  currentKidId?: string; // Optional since it might be a parent viewing
  familyId: string;
  // Sync functionality (optional - only shown if provided)
  onSync?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage?: string;
  lastSyncTime?: Date | null;
}

export default function LiveLeaderboard({
  familyMembers,
  currentKidId,
  familyId,
  onSync,
  syncStatus = 'idle',
  syncMessage,
  lastSyncTime,
}: Props) {
  const [leaderboard, setLeaderboard] = useState(familyMembers);
  const [isLive, setIsLive] = useState(false);

  // Sync with parent state updates (e.g., after chore completion)
  useEffect(() => {
    setLeaderboard(familyMembers);
  }, [familyMembers]);

  // Show all family members (parents and kids) sorted by points
  const allMembers = leaderboard
    .sort((a, b) => b.current_points - a.current_points);

  const getRankEmoji = (index: number, isCurrentUser: boolean, role: string) => {
    if (index === 0) return isCurrentUser ? "👑" : "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    
    // Different emojis for parents vs children
    if (role === "parent") {
      return isCurrentUser ? "👨‍👩‍👧‍👦" : "👨‍👩‍👧‍👦";
    } else {
      return isCurrentUser ? "👶" : "🧒";
    }
  };

  const calculateStreak = (points: number) => {
    if (points > 800) return 5;
    if (points > 600) return 4;
    if (points > 400) return 3;
    if (points > 200) return 2;
    if (points > 100) return 1;
    return 0;
  };

  const getStreakDisplay = (points: number) => {
    const streak = calculateStreak(points);
    if (streak > 0) {
      return `🔥${streak}`;
    }
    return "";
  };

  // Handle leaderboard updates from shared WebSocket
  const handleLeaderboardUpdate = (newLeaderboard: any[]) => {
    setLeaderboard(newLeaderboard);
    setIsLive(true);
    console.log("📊 Leaderboard updated via shared WebSocket");
  };

  return (
    <WebSocketManager 
      familyId={familyId} 
      onLeaderboardUpdate={handleLeaderboardUpdate}
    >
      <div class="leaderboard">
      <div class="leaderboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          🏆 Family Leaderboard
          {isLive && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-success)",
                marginLeft: "0.5rem",
              }}
            >
              🟢 LIVE
            </span>
          )}
        </div>
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncStatus === 'syncing'}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: "500",
              border: "none",
              borderRadius: "6px",
              cursor: syncStatus === 'syncing' ? 'wait' : 'pointer',
              backgroundColor: syncStatus === 'success' ? '#dcfce7' :
                               syncStatus === 'error' ? '#fee2e2' :
                               'var(--color-bg)',
              color: syncStatus === 'success' ? '#166534' :
                     syncStatus === 'error' ? '#991b1b' :
                     'var(--color-text-light)',
              opacity: syncStatus === 'syncing' ? 0.7 : 1,
              transition: "all 0.2s",
            }}
            title="Sync leaderboard with FamilyScore"
          >
            {syncStatus === 'syncing' ? '🔄 Syncing...' :
             syncStatus === 'success' ? '✓ Synced' :
             syncStatus === 'error' ? '✕ Error' :
             '🔄 Sync'}
          </button>
        )}
      </div>

      {/* Sync status message */}
      {syncMessage && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            borderRadius: "6px",
            backgroundColor: syncStatus === 'success' ? '#dcfce7' :
                            syncStatus === 'error' ? '#fee2e2' : '#f1f5f9',
            color: syncStatus === 'success' ? '#166534' :
                   syncStatus === 'error' ? '#991b1b' : '#475569',
          }}
        >
          {syncMessage}
          {lastSyncTime && syncStatus === 'success' && (
            <span style={{ marginLeft: "0.5rem", opacity: 0.7 }}>
              ({lastSyncTime.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}

      {allMembers.map((member, index) => {
        const isCurrentUser = Boolean(currentKidId && member.id === currentKidId);
        return (
          <div
            key={member.id}
            class="leaderboard-row"
            style={{
              background: isCurrentUser
                ? "linear-gradient(90deg, var(--color-accent)22, transparent)"
                : index === 0
                ? "linear-gradient(90deg, var(--color-accent)11, transparent)"
                : "transparent",
            }}
          >
            <div class="leaderboard-rank">
              {index + 1}.
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "1.25rem" }}>
                {getRankEmoji(index, isCurrentUser, member.role)}
              </span>
              <span class="leaderboard-name">
                {isCurrentUser ? `You (${member.name})` : member.name}
                {member.role === "parent" && (
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "var(--color-text-light)",
                    marginLeft: "0.25rem"
                  }}>
                    (Parent)
                  </span>
                )}
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span class="leaderboard-points">
                {member.current_points} pts
              </span>
              <span class="streak">
                {getStreakDisplay(member.current_points)}
              </span>
            </div>
          </div>
        );
      })}

      {allMembers.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "var(--color-text-light)",
            padding: "1rem",
          }}
        >
          No family members found
        </div>
      )}
      </div>
    </WebSocketManager>
  );
}
