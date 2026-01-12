/**
 * Chore List Component
 * Displays list of chores with completion actions
 */

import { useState } from "preact/hooks";

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
  chores: ChoreAssignment[];
  onChoreComplete: (choreId: string) => void;
  kidId: string;
}

export default function ChoreList({ chores, onChoreComplete, kidId }: Props) {
  const [completingChore, setCompletingChore] = useState<string | null>(null);

  const handleChoreComplete = async (chore: ChoreAssignment) => {
    if (chore.status === "completed" || completingChore === chore.id) {
      return; // Already completed or in progress
    }

    setCompletingChore(chore.id);

    try {
      const response = await fetch(`/api/chores/${chore.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kid_id: kidId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🎉 Chore completed:', result);
        
        // Call the parent's completion handler to update the UI
        onChoreComplete(chore.id);
      } else {
        const error = await response.json();
        console.error('Failed to complete chore:', error);
        alert('Failed to complete chore. Please try again.');
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
              <span style={{ fontSize: "1.5rem" }}>
                {getChoreIcon(chore)}
              </span>
              <div>
                <div class="chore-name">
                  {chore.chore_template?.name || "Untitled Chore"}
                </div>
                {chore.chore_template?.description && (
                  <div class="chore-description">
                    {chore.chore_template.description}
                  </div>
                )}
              </div>
            </div>
            <div class="chore-points">
              +{chore.point_value} pts
            </div>
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
