/**
 * Chore List Component
 * Displays list of chores with completion actions
 */

import { useState } from "preact/hooks";
import { triggerCelebration } from "./ConfettiTrigger.tsx";

interface ChoreAssignment {
  id: string;
  status: "pending" | "completed" | "verified" | "rejected";
  point_value: number;
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

interface Props {
  chores: ChoreAssignment[];
  onChoreComplete: (choreId: string, result: { points_earned: number; choreName: string }) => void;
  kidId: string;
  showPoints?: boolean;
}

export default function ChoreList({ chores, onChoreComplete, kidId, showPoints = true }: Props) {
  const [completingChore, setCompletingChore] = useState<string | null>(null);

  const handleChoreComplete = async (chore: ChoreAssignment) => {
    if (chore.status === "completed" || completingChore === chore.id) {
      return; // Already completed or in progress
    }

    setCompletingChore(chore.id);

    try {
      let response: Response;

      if (chore.source === "rotation" && chore.rotation_key && chore.rotation_date) {
        // Rotation chore - use rotation complete endpoint
        response = await fetch('/api/rotation/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chore_key: chore.rotation_key,
            date: chore.rotation_date,
            kid_id: kidId,
          }),
        });
      } else {
        // Manual chore - use regular complete endpoint
        response = await fetch(`/api/chores/${chore.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ kid_id: kidId }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('🎉 Chore completed:', result);

        // Trigger confetti celebration
        triggerCelebration('chore_complete');

        // Pass result data so parent can update points/leaderboard/activity
        const choreName = chore.chore_template?.name || "Chore";
        const pointsEarned = result.points_earned ?? result.chore?.points ?? chore.point_value;
        onChoreComplete(chore.id, { points_earned: pointsEarned, choreName });
      } else {
        const error = await response.json();
        console.error('Failed to complete chore:', error);
        if (error.already_completed) {
          alert('This chore was already completed today!');
        } else {
          alert('Failed to complete chore. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error completing chore:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setCompletingChore(null);
    }
  };

  const getChoreIcon = (chore: ChoreAssignment) => {
    if (chore.chore_template?.icon) {
      return chore.chore_template.icon;
    }

    // Default icons based on chore name
    const name = chore.chore_template?.name?.toLowerCase() || "";
    if (name.includes("dish")) return "🍽️";
    if (name.includes("trash")) return "🗑️";
    if (name.includes("bed")) return "🛏️";
    if (name.includes("dog") || name.includes("pet")) return "🐕";
    if (name.includes("room") || name.includes("clean")) return "🧹";
    if (name.includes("homework")) return "📚";
    if (name.includes("vacuum")) return "🔌";
    if (name.includes("laundry")) return "👕";
    return "✅";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "verified":
        return "✅";
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
    <div>
      {chores.map((chore) => (
        <div
          key={chore.id}
          class={`card chore-card ${
            chore.status === "completed" ? "completed" : ""
          }`}
          style={{
            opacity: chore.status === "completed" ? 0.8 : 1,
          }}
        >
          <div class="chore-header">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
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
                <span style={{ fontSize: "0.875rem" }} title="From rotation template">🔄</span>
              )}
              <span style={{ fontSize: "1.5rem" }}>
                {getChoreIcon(chore)}
              </span>
              <div>
                <div class="chore-name">
                  {chore.chore_template?.name || "Untitled Chore"}
                </div>
                {chore.chore_template?.description && (
                  <div class="chore-description" style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                    {chore.chore_template.description}
                  </div>
                )}
              </div>
            </div>
            {showPoints && (
              <div class="chore-points">
                +{chore.point_value} pts
              </div>
            )}
          </div>

          {chore.status === "completed" && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-success)",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              ✨ Completed! Great job!
            </div>
          )}

          {chore.status === "pending" && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-light)",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              {completingChore === chore.id ? "Completing..." : "Tap ☐ to complete"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
