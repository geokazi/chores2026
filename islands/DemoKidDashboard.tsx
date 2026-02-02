/**
 * DemoKidDashboard - Interactive demo of the kid dashboard
 * Shows how ChoreGami works without requiring an account
 */

import { useState } from "preact/hooks";
import DemoChoreCard from "./DemoChoreCard.tsx";

interface DemoMember {
  id: string;
  name: string;
  role: "child" | "parent";
  current_points: number;
  avatar: string;
}

interface DemoChore {
  id: string;
  name: string;
  icon: string;
  points: number;
  status: "pending" | "completed";
}

interface ActivityItem {
  id: string;
  text: string;
  points: number;
  time: string;
}

interface Props {
  familyName: string;
  members: DemoMember[];
  initialChores: Record<string, DemoChore[]>;
  initialActivity: ActivityItem[];
}

export default function DemoKidDashboard({
  familyName,
  members,
  initialChores,
  initialActivity,
}: Props) {
  // State for selected kid
  const kids = members.filter((m) => m.role === "child");
  const [selectedKid, setSelectedKid] = useState<DemoMember>(kids[0]);

  // State for chores (mutable for demo)
  const [chores, setChores] = useState<Record<string, DemoChore[]>>(initialChores);

  // State for leaderboard points
  const [leaderboard, setLeaderboard] = useState<DemoMember[]>(members);

  // State for activity feed
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);

  // Handle chore completion
  const handleChoreComplete = (choreId: string, points: number) => {
    // Update chore status
    setChores((prev) => {
      const kidId = selectedKid.id.replace("demo-", "");
      const kidChores = prev[kidId] || [];
      return {
        ...prev,
        [kidId]: kidChores.map((c) =>
          c.id === choreId ? { ...c, status: "completed" as const } : c
        ),
      };
    });

    // Update leaderboard points
    setLeaderboard((prev) =>
      prev.map((m) =>
        m.id === selectedKid.id
          ? { ...m, current_points: m.current_points + points }
          : m
      )
    );

    // Find chore name
    const kidId = selectedKid.id.replace("demo-", "");
    const completedChore = chores[kidId]?.find((c) => c.id === choreId);

    // Add to activity feed
    const newActivity: ActivityItem = {
      id: `activity-${Date.now()}`,
      text: `${selectedKid.name} completed "${completedChore?.name || "a chore"}"`,
      points: points,
      time: "Just now",
    };
    setActivity((prev) => [newActivity, ...prev.slice(0, 4)]);
  };

  // Get current kid's data
  const currentKid = leaderboard.find((m) => m.id === selectedKid.id) || selectedKid;
  const kidId = selectedKid.id.replace("demo-", "");
  const kidChores = chores[kidId] || [];
  const completedCount = kidChores.filter((c) => c.status === "completed").length;

  // Sort leaderboard by points
  const sortedKids = [...leaderboard]
    .filter((m) => m.role === "child")
    .sort((a, b) => b.current_points - a.current_points);

  const kidRank = sortedKids.findIndex((m) => m.id === selectedKid.id) + 1;

  const getRankDisplay = () => {
    if (kidRank === 1) return "\u{1F3C6} You're #1!";
    if (kidRank === 2) return "\u{1F948} You're #2!";
    return `You're #${kidRank}`;
  };

  return (
    <div>
      {/* Kid Selector Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          justifyContent: "center",
        }}
      >
        {kids.map((kid) => (
          <button
            key={kid.id}
            onClick={() => setSelectedKid(kid)}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "12px",
              border: "2px solid",
              borderColor:
                selectedKid.id === kid.id
                  ? "var(--color-primary)"
                  : "var(--color-border)",
              background:
                selectedKid.id === kid.id
                  ? "var(--color-primary)"
                  : "var(--color-card)",
              color: selectedKid.id === kid.id ? "white" : "var(--color-text)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "1rem",
            }}
          >
            {kid.avatar === "girl" ? "\u{1F467}" : "\u{1F466}"} {kid.name}
          </button>
        ))}
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
          {selectedKid.name}'s Missions Today ({completedCount}/{kidChores.length})
        </h2>

        {kidChores.map((chore) => (
          <DemoChoreCard
            key={chore.id}
            chore={chore}
            onComplete={handleChoreComplete}
          />
        ))}

        {kidChores.length === 0 && (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-text-light)" }}>
              🎉 No chores assigned!
            </p>
          </div>
        )}
      </div>

      {/* Status Card */}
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
          {currentKid.current_points} pts
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
          Today's Progress: {completedCount}/{kidChores.length} chores \u2B50
        </div>
      </div>

      {/* Leaderboard */}
      <div class="leaderboard" style={{ marginBottom: "1.5rem" }}>
        <div class="leaderboard-header">
          🏆 {familyName} Leaderboard
        </div>
        {sortedKids.map((member, index) => (
          <div
            key={member.id}
            class="leaderboard-row"
            style={{
              background:
                member.id === selectedKid.id
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)"
                  : undefined,
              border:
                member.id === selectedKid.id
                  ? "1px solid rgba(16, 185, 129, 0.15)"
                  : undefined,
            }}
          >
            <span class="leaderboard-rank">
              {index === 0 ? "\u{1F947}" : index === 1 ? "\u{1F948}" : `${index + 1}`}
            </span>
            <span class="leaderboard-name">
              {member.avatar === "girl" ? "\u{1F467}" : "\u{1F466}"} {member.name}
              {member.id === selectedKid.id && " (you)"}
            </span>
            <span class="leaderboard-points">{member.current_points} pts</span>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div class="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              margin: 0,
            }}
          >
            📝 Recent Activity
          </h3>
          <span class="live-indicator">
            🟢 Live
          </span>
        </div>
        <div class="activity-feed">
          {activity.map((item) => (
            <div key={item.id} class="activity-item">
              <span class="activity-text">{item.text}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--color-primary)", fontWeight: "600", fontSize: "0.875rem" }}>
                  +{item.points}
                </div>
                <span class="activity-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Hint */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>
          💡 <strong>Try it!</strong> Tap the checkbox on any chore to complete it and see the points update in real-time.
        </div>
      </div>
    </div>
  );
}
