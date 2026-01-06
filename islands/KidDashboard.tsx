/**
 * Kid Dashboard Island
 * Main interface for kids showing their status, chores, and family leaderboard
 */

import { useEffect, useState } from "preact/hooks";
import ChoreList from "./ChoreList.tsx";
import LiveLeaderboard from "./LiveLeaderboard.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";

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
  chore_template?: {
    name: string;
    description?: string;
    icon?: string;
  };
}

interface Props {
  kid: FamilyMember;
  family: any;
  familyMembers: FamilyMember[];
  todaysChores: ChoreAssignment[];
  recentActivity: any[];
}

export default function KidDashboard({
  kid,
  family,
  familyMembers,
  todaysChores,
  recentActivity,
}: Props) {
  const [chores, setChores] = useState(todaysChores);
  const [leaderboard, setLeaderboard] = useState(familyMembers);
  const [activity, setActivity] = useState(recentActivity);

  // Calculate kid's ranking and streak
  const sortedMembers = [...leaderboard]
    .filter((member) => member.role === "child")
    .sort((a, b) => b.current_points - a.current_points);

  const kidRank = sortedMembers.findIndex((member) => member.id === kid.id) + 1;
  const completedChores =
    chores.filter((chore) => chore.status === "completed").length;
  const totalChores = chores.length;

  const calculateStreak = (points: number) => {
    if (points > 800) return 5;
    if (points > 600) return 4;
    if (points > 400) return 3;
    if (points > 200) return 2;
    if (points > 100) return 1;
    return 0;
  };

  const getRankDisplay = () => {
    if (kidRank === 1) return "🏆 You're #1!";
    if (kidRank === 2) return "🥈 You're #2!";
    if (kidRank === 3) return "🥉 You're #3!";
    return `You're #${kidRank}`;
  };

  const getStreakDisplay = () => {
    const streak = calculateStreak(kid.current_points);
    if (streak > 0) {
      return `🔥${streak}`;
    }
    return "";
  };

  const handleChoreComplete = async (choreId: string) => {
    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kid_id: kid.id }),
      });

      if (response.ok) {
        // Update local chore status
        setChores((prev) =>
          prev.map((chore) =>
            chore.id === choreId
              ? { ...chore, status: "completed" as const }
              : chore
          )
        );

        // Show celebration (this could trigger a modal)
        // TODO: Add celebration modal here

        // The WebSocket connection will update leaderboard automatically
      } else {
        console.error("Failed to complete chore");
      }
    } catch (error) {
      console.error("Error completing chore:", error);
    }
  };

  return (
    <div>
      {/* Kid's Status Header */}
      <div class="card" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          {getRankDisplay()}
        </div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "var(--color-primary)",
            marginBottom: "0.5rem",
          }}
        >
          {kid.current_points} pts {getStreakDisplay()}
        </div>
        {totalChores > 0 && (
          <div
            style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}
          >
            Today's Progress: {completedChores}/{totalChores} chores ⭐
          </div>
        )}
      </div>

      {/* Today's Chores */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "var(--color-text)",
          }}
        >
          Your Chores Today ({completedChores}/{totalChores})
        </h2>

        <ChoreList
          chores={chores}
          onChoreComplete={handleChoreComplete}
          kidId={kid.id}
        />

        {chores.length === 0 && (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-text-light)" }}>
              🎉 No chores assigned for today!
            </p>
          </div>
        )}

        {chores.length > 0 && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-light)",
              textAlign: "center",
              marginTop: "1rem",
            }}
          >
            Tap any chore to complete →
          </p>
        )}
      </div>

      {/* Family Leaderboard */}
      <div style={{ marginBottom: "1.5rem" }}>
        <LiveLeaderboard
          familyMembers={leaderboard}
          currentKidId={kid.id}
          familyId={family.id}
        />
      </div>

      {/* Recent Activity Feed */}
      <div>
        <LiveActivityFeed
          initialActivity={activity}
          familyId={family.id}
        />
      </div>
    </div>
  );
}
