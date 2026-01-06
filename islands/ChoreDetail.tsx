/**
 * Chore Detail Component
 * Shows chore instructions and completion interface
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
  completed_at?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  current_points: number;
}

interface Props {
  kid: FamilyMember;
  family: any;
  chore: ChoreAssignment;
}

export default function ChoreDetail({ kid, family, chore }: Props) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const getChoreIcon = () => {
    if (chore.chore_template?.icon) {
      return chore.chore_template.icon;
    }

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

  const getInstructions = () => {
    if (chore.chore_template?.description) {
      return chore.chore_template.description.split("\n").map((
        line: string,
        index: number,
      ) => <div key={index}>• {line.trim()}</div>);
    }

    // Default instructions based on chore name
    const name = chore.chore_template?.name?.toLowerCase() || "";
    if (name.includes("trash")) {
      return (
        <>
          <div>• Gather all trash cans</div>
          <div>• Tie bags securely</div>
          <div>• Take to curb</div>
        </>
      );
    }
    if (name.includes("dish")) {
      return (
        <>
          <div>• Rinse all dishes</div>
          <div>• Load dishwasher properly</div>
          <div>• Start wash cycle</div>
        </>
      );
    }
    if (name.includes("bed")) {
      return (
        <>
          <div>• Pull sheets tight</div>
          <div>• Fluff pillows</div>
          <div>• Fold blanket neatly</div>
        </>
      );
    }
    if (name.includes("dog") || name.includes("pet")) {
      return (
        <>
          <div>• Fill bowl with food</div>
          <div>• Check water is fresh</div>
          <div>• Give pets some attention</div>
        </>
      );
    }

    return <div>• Complete the task as assigned</div>;
  };

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      const response = await fetch(window.location.pathname, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowCelebration(true);

        // Show celebration for 3 seconds then redirect
        setTimeout(() => {
          window.location.href = `/kid/${kid.id}/dashboard`;
        }, 3000);
      } else {
        console.error("Failed to complete chore");
        setIsCompleting(false);
      }
    } catch (error) {
      console.error("Error completing chore:", error);
      setIsCompleting(false);
    }
  };

  if (showCelebration) {
    return (
      <div class="celebration">
        <div class="celebration-emoji">🎉</div>
        <div class="celebration-points">
          +{chore.point_value} points!
        </div>
        <div class="celebration-total">
          New total: {kid.current_points + chore.point_value} pts
        </div>
        <div style={{ fontSize: "1rem", color: "var(--color-text-light)" }}>
          Great job, {kid.name}!
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-light)",
            marginTop: "1rem",
          }}
        >
          (returning to dashboard in 3s)
        </div>
      </div>
    );
  }

  if (chore.status === "completed") {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
          {getChoreIcon()}
        </div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Already Completed!
        </h2>
        <div
          style={{
            fontSize: "1.125rem",
            color: "var(--color-success)",
            marginBottom: "2rem",
          }}
        >
          You earned {chore.point_value} points
        </div>
        <a
          href={`/kid/${kid.id}/dashboard`}
          class="btn btn-primary"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Chore Icon and Info */}
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
        {getChoreIcon()}
      </div>

      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          marginBottom: "0.5rem",
        }}
      >
        {chore.chore_template?.name || "Chore"}
      </h2>

      <div
        style={{
          fontSize: "1.25rem",
          color: "var(--color-accent)",
          fontWeight: "600",
          marginBottom: "2rem",
        }}
      >
        Worth {chore.point_value} points
      </div>

      {/* Instructions */}
      <div class="card" style={{ textAlign: "left", marginBottom: "2rem" }}>
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          Instructions:
        </h3>
        <div
          style={{
            fontSize: "1rem",
            lineHeight: "1.6",
            color: "var(--color-text)",
          }}
        >
          {getInstructions()}
        </div>
      </div>

      {/* Completion Button */}
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        class="btn btn-primary"
        style={{
          fontSize: "1.125rem",
          padding: "1.25rem",
          width: "100%",
          opacity: isCompleting ? 0.7 : 1,
        }}
      >
        {isCompleting
          ? (
            <>
              <span>Completing...</span>
            </>
          )
          : (
            <>
              ✓ I Did This!<br />
              <span style={{ fontSize: "0.875rem" }}>
                (+{chore.point_value} points)
              </span>
            </>
          )}
      </button>

      {/* Completion History */}
      <div
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text-light)",
          marginTop: "2rem",
        }}
      >
        {chore.completed_at
          ? (
            `Last completed: ${
              new Date(chore.completed_at).toLocaleDateString()
            }`
          )
          : (
            "Never completed before"
          )}
      </div>
    </div>
  );
}
