/**
 * Kid Dashboard Island
 * Main interface for kids showing their status, chores, and family leaderboard
 */

import { useEffect, useState, useMemo } from "preact/hooks";
import ChoreList from "./ChoreList.tsx";
import LiveLeaderboard from "./LiveLeaderboard.tsx";
import LiveActivityFeed from "./LiveActivityFeed.tsx";
import EventMissionGroup from "./EventMissionGroup.tsx";
import { groupChoresByEvent, usePointsMode, formatTime } from "../lib/utils/household.ts";

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
  family_event_id?: string | null;
  family_event?: {
    id: string;
    title: string;
    emoji?: string;
    event_date: string;
    schedule_data?: {
      all_day?: boolean;
      start_time?: string;
    };
    metadata?: {
      emoji?: string;
    };
  } | null;
  source?: "manual" | "rotation";
  rotation_key?: string;
  rotation_preset?: string;
  rotation_date?: string;
  chore_template?: {
    name: string;
    description?: string;
    icon?: string;
  };
}

interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
}

interface LinkedChore {
  id: string;
  status: string;
  point_value: number;
  chore_template?: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  schedule_data?: {
    all_day?: boolean;
    start_time?: string;
  };
  metadata?: {
    emoji?: string;
    prep_tasks?: PrepTask[];
  };
  linked_chores?: LinkedChore[];
}

interface Props {
  kid: FamilyMember;
  family: any;
  familyMembers: FamilyMember[];
  todaysChores: ChoreAssignment[];
  upcomingEvents?: UpcomingEvent[];
  recentActivity: any[];
  onChoreComplete?: () => void;
  onPrepTaskToggle?: (eventId: string, taskId: string, done: boolean) => void;
}

export default function KidDashboard({
  kid,
  family,
  familyMembers,
  todaysChores,
  upcomingEvents = [],
  recentActivity,
  onChoreComplete,
  onPrepTaskToggle,
}: Props) {
  const [chores, setChores] = useState(todaysChores);
  const [leaderboard, setLeaderboard] = useState(familyMembers);
  const [activity, setActivity] = useState(recentActivity);

  // Update chores when props change (after refresh)
  useEffect(() => {
    setChores(todaysChores);
  }, [todaysChores]);

  // Group chores by event for mission display
  const groupedChores = useMemo(() => groupChoresByEvent(chores), [chores]);
  const showPoints = useMemo(() => usePointsMode(chores), [chores]);

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

  const handleChoreComplete = (choreId: string) => {
    // Update local chore status immediately for responsive UI
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === choreId
          ? { ...chore, status: "completed" as const }
          : chore
      )
    );

    // Trigger parent component refresh if provided
    if (onChoreComplete) {
      onChoreComplete();
    }

    // The WebSocket connection will update leaderboard automatically via FamilyScore
    console.log('🎉 Chore marked as completed locally:', choreId);
  };

  return (
    <div>
      {/* Today's Chores - First, right after Family Goal */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "var(--color-text)",
          }}
        >
          Your Missions Today ({completedChores}/{totalChores})
        </h2>

        {/* Event Mission Groups - Show chores grouped by event first */}
        {groupedChores.events.map(({ event, chores: eventChores }) => (
          <EventMissionGroup
            key={event.id}
            event={event}
            chores={eventChores}
            kidId={kid.id}
            onChoreComplete={handleChoreComplete}
          />
        ))}

        {/* Regular Chores - Not linked to any event */}
        {groupedChores.unlinked.length > 0 && (
          <div style={{ marginTop: groupedChores.events.length > 0 ? "1rem" : "0" }}>
            {groupedChores.events.length > 0 && (
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "var(--color-text)",
                }}
              >
                {showPoints ? "Earn Points Today" : "Other Tasks"}
              </h3>
            )}
            <ChoreList
              chores={groupedChores.unlinked}
              onChoreComplete={handleChoreComplete}
              kidId={kid.id}
              showPoints={showPoints}
            />
          </div>
        )}

        {chores.length === 0 && (
          <div class="card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--color-text-light)" }}>
              🎉 No chores assigned for today!
            </p>
          </div>
        )}

      </div>

      {/* Upcoming Events - Show events the kid is participating in */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "var(--color-text)",
            }}
          >
            📅 Coming Up
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {upcomingEvents.map((event) => {
              const eventDate = new Date(event.event_date + "T00:00:00");
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const eventDateOnly = new Date(event.event_date + "T00:00:00");
              eventDateOnly.setHours(0, 0, 0, 0);

              let dateLabel: string;
              if (eventDateOnly.getTime() === today.getTime()) {
                dateLabel = "Today";
              } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
                dateLabel = "Tomorrow";
              } else {
                dateLabel = eventDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              }

              const timeStr = event.schedule_data?.start_time
                ? formatTime(event.schedule_data.start_time)
                : event.schedule_data?.all_day
                ? "All day"
                : "";

              const emoji = event.metadata?.emoji || "📅";

              // Get prep tasks assigned to this kid
              const myPrepTasks = (event.metadata?.prep_tasks || []).filter(
                task => !task.assignee_id || task.assignee_id === kid.id
              );

              // Get linked chores for this event
              const myLinkedChores = event.linked_chores || [];

              // Show missions section if either prep tasks or linked chores exist
              const hasMissions = myPrepTasks.length > 0 || myLinkedChores.length > 0;

              return (
                <div
                  key={event.id}
                  class="card"
                  style={{
                    padding: "0.75rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "500" }}>{event.title}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
                        {dateLabel}
                        {timeStr && ` at ${timeStr}`}
                      </div>
                    </div>
                  </div>

                  {/* Prep tasks and linked chores for this kid */}
                  {hasMissions && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginBottom: "0.5rem" }}>
                        Your missions:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        {/* Prep tasks */}
                        {myPrepTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => onPrepTaskToggle?.(event.id, task.id, !task.done)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: task.done ? "var(--color-bg)" : "white",
                              cursor: "pointer",
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>
                              {task.done ? "✅" : "⬜"}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                fontSize: "0.875rem",
                                textDecoration: task.done ? "line-through" : "none",
                                color: task.done ? "var(--color-text-light)" : "var(--color-text)",
                              }}
                            >
                              {task.text}
                            </span>
                          </button>
                        ))}
                        {/* Linked chores */}
                        {myLinkedChores.map((chore) => (
                          <div
                            key={chore.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              border: "1px solid var(--color-border)",
                              borderRadius: "0.375rem",
                              background: chore.status === "completed" ? "var(--color-bg)" : "white",
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>
                              {chore.status === "completed" ? "✅" : "⬜"}
                            </span>
                            <span style={{ fontSize: "1rem" }}>
                              {chore.chore_template?.icon || "📋"}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                fontSize: "0.875rem",
                                textDecoration: chore.status === "completed" ? "line-through" : "none",
                                color: chore.status === "completed" ? "var(--color-text-light)" : "var(--color-text)",
                              }}
                            >
                              {chore.chore_template?.name || "Task"}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                              (due {event.event_date.slice(5)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kid's Status Card - Above leaderboard */}
      <div class="card" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        {showPoints && (
          <>
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
          </>
        )}
        {totalChores > 0 && (
          <div
            style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}
          >
            Today's Progress: {completedChores}/{totalChores} {showPoints ? "chores" : "tasks"} ⭐
          </div>
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
      <div style={{ marginBottom: "1.5rem" }}>
        <LiveActivityFeed
          initialActivity={activity}
          familyId={family.id}
        />
      </div>

      {/* Family Reports Link */}
      <div style={{ textAlign: "center" }}>
        <a
          href="/reports"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--color-secondary)",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          📊 See Family Progress
        </a>
      </div>
    </div>
  );
}
