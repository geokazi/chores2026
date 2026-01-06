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

  const handleChoreClick = async (chore: ChoreAssignment) => {
    if (chore.status === "completed") {
      return; // Already completed
    }

    // Navigate to chore detail page for completion
    window.location.href = `/kid/${kidId}/chore/${chore.id}`;
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
          onClick={() => handleChoreClick(chore)}
          style={{
            cursor: chore.status === "completed" ? "default" : "pointer",
            opacity: chore.status === "completed" ? 0.8 : 1,
          }}
        >
          <div class="chore-header">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <span
                style={{
                  fontSize: "1.25rem",
                  color: getStatusColor(chore.status),
                }}
              >
                {getStatusIcon(chore.status)}
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
              Tap to complete
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
