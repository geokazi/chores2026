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
  currentKidId: string;
  familyId: string;
}

export default function LiveLeaderboard({
  familyMembers,
  currentKidId,
  familyId,
}: Props) {
  const [leaderboard, setLeaderboard] = useState(familyMembers);
  const [isLive, setIsLive] = useState(false);

  // Filter to only kids and sort by points
  const kids = leaderboard
    .filter((member) => member.role === "child")
    .sort((a, b) => b.current_points - a.current_points);

  const getRankEmoji = (index: number, isCurrentKid: boolean) => {
    if (index === 0) return isCurrentKid ? "👑" : "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return isCurrentKid ? "👶" : "🧒";
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
      <div class="leaderboard-header">
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

      {kids.map((kid, index) => {
        const isCurrentKid = kid.id === currentKidId;
        return (
          <div
            key={kid.id}
            class="leaderboard-row"
            style={{
              background: isCurrentKid
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
                {getRankEmoji(index, isCurrentKid)}
              </span>
              <span class="leaderboard-name">
                {isCurrentKid ? `You (${kid.name})` : kid.name}
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span class="leaderboard-points">
                {kid.current_points} pts
              </span>
              <span class="streak">
                {getStreakDisplay(kid.current_points)}
              </span>
            </div>
          </div>
        );
      })}

      {kids.length === 0 && (
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
