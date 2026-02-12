/**
 * Event Mission Group Component
 * Displays chores grouped by a family event as a "mission"
 * Points are always hidden for event missions (focus is on preparation, not points)
 */

import { useState } from "preact/hooks";
import { FamilyEvent, ChoreAssignment, formatTime } from "../lib/utils/household.ts";
import { triggerCelebration } from "./ConfettiTrigger.tsx";

interface Props {
  event: FamilyEvent;
  chores: ChoreAssignment[];
  kidId: string;
  onChoreComplete: (choreId: string, result: { points_earned: number; choreName: string }) => void;
}

export default function EventMissionGroup({ event, chores, kidId, onChoreComplete }: Props) {
  const [completingChore, setCompletingChore] = useState<string | null>(null);

  const completedCount = chores.filter((c) => c.status === "completed" || c.status === "verified").length;
  const allComplete = completedCount === chores.length;
  const eventEmoji = event.metadata?.emoji || event.emoji || "📅";

  const handleChoreComplete = async (chore: ChoreAssignment) => {
    if (chore.status === "completed" || completingChore === chore.id) {
      return;
    }

    setCompletingChore(chore.id);

    try {
      let response: Response;
      // Get browser timezone for consistent week boundary calculation
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (chore.source === "rotation" && chore.rotation_key && chore.rotation_date) {
        response = await fetch("/api/rotation/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chore_key: chore.rotation_key,
            date: chore.rotation_date,
            kid_id: kidId,
            timezone,
          }),
        });
      } else {
        response = await fetch(`/api/chores/${chore.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kid_id: kidId, timezone }),
        });
      }

      if (response.ok) {
        const result = await response.json();

        // Trigger confetti celebration
        triggerCelebration('chore_complete');

        const choreName = chore.chore_template?.name || "Task";
        const pointsEarned = result.points_earned ?? result.chore?.points ?? chore.point_value;
        onChoreComplete(chore.id, { points_earned: pointsEarned, choreName });
      } else {
        const error = await response.json();
        if (error.already_completed) {
          alert("This task was already completed!");
        } else {
          alert("Failed to complete task. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error completing chore:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setCompletingChore(null);
    }
  };

  const getChoreIcon = (chore: ChoreAssignment) => {
    if (chore.chore_template?.icon) return chore.chore_template.icon;
    const name = chore.chore_template?.name?.toLowerCase() || "";
    if (name.includes("dish")) return "🍽️";
    if (name.includes("trash")) return "🗑️";
    if (name.includes("bed")) return "🛏️";
    if (name.includes("dog") || name.includes("pet")) return "🐕";
    if (name.includes("room") || name.includes("clean")) return "🧹";
    if (name.includes("vacuum")) return "🔌";
    if (name.includes("laundry")) return "👕";
    if (name.includes("pack")) return "🎒";
    if (name.includes("uniform") || name.includes("clothes")) return "👔";
    return "✅";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "verified":
        return "✓";
      case "rejected":
        return "❌";
      default:
        return "☐";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "verified":
        return "var(--color-success)";
      case "rejected":
        return "var(--color-warning)";
      default:
        return "var(--color-text)";
    }
  };

  return (
    <section
      style={{
        marginBottom: "1.5rem",
        borderLeft: "4px solid #8b5cf6",
        paddingLeft: "1rem",
      }}
    >
      {/* Event Header */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h2
          style={{
            margin: "0 0 0.25rem 0",
            fontSize: "1.125rem",
            fontWeight: "600",
            color: "var(--color-text)",
          }}
        >
          {eventEmoji} Get Ready for {event.title}!
        </h2>
        {event.schedule_data?.start_time && !event.schedule_data?.all_day && (
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            Today at {formatTime(event.schedule_data.start_time)}
          </span>
        )}
        {event.schedule_data?.all_day && (
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
            All day
          </span>
        )}
      </div>

      {/* Celebration if all complete */}
      {allComplete && (
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            padding: "1rem",
            borderRadius: "0.5rem",
            textAlign: "center",
            marginBottom: "0.75rem",
            fontWeight: "600",
          }}
        >
          🎉 All set for {event.title}! 🎉
          <br />
          <span style={{ fontWeight: "400", fontSize: "0.875rem" }}>You're ready to go!</span>
        </div>
      )}

      {/* Mission List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {chores.map((chore) => (
          <div
            key={chore.id}
            class="card"
            style={{
              padding: "0.75rem 1rem",
              opacity: chore.status === "completed" ? 0.8 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                onClick={() => handleChoreComplete(chore)}
                style={{
                  fontSize: "1.25rem",
                  color: getStatusColor(chore.status),
                  cursor: chore.status === "completed" || completingChore === chore.id ? "default" : "pointer",
                  opacity: completingChore === chore.id ? 0.5 : 1,
                }}
              >
                {completingChore === chore.id ? "⏳" : getStatusIcon(chore.status)}
              </span>
              {chore.source === "rotation" && (
                <span style={{ fontSize: "0.875rem" }} title="From rotation template">
                  🔄
                </span>
              )}
              <span style={{ fontSize: "1.25rem" }}>{getChoreIcon(chore)}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "500",
                    textDecoration: chore.status === "completed" ? "line-through" : "none",
                    color: chore.status === "completed" ? "var(--color-text-light)" : "var(--color-text)",
                  }}
                >
                  {chore.chore_template?.name || "Untitled Task"}
                </div>
                {chore.chore_template?.description && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                    {chore.chore_template.description}
                  </div>
                )}
              </div>
              {/* NO points display for event missions */}
            </div>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      {!allComplete && (
        <div
          style={{
            textAlign: "center",
            color: "var(--color-text-light)",
            fontSize: "0.875rem",
            marginTop: "0.75rem",
          }}
        >
          {completedCount}/{chores.length} done - Complete all to be ready! ✨
        </div>
      )}
    </section>
  );
}
