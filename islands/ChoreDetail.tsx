/**
 * Simple Chore Detail Component - Single Responsibility
 * Shows chore and handles completion via existing API
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
    if (chore.chore_template?.icon) return chore.chore_template.icon;
    const name = chore.chore_template?.name?.toLowerCase() || "";
    if (name.includes("dish")) return "🍽️";
    if (name.includes("trash")) return "🗑️"; 
    if (name.includes("bed")) return "🛏️";
    if (name.includes("dog") || name.includes("pet")) return "🐕";
    if (name.includes("room") || name.includes("clean")) return "🧹";
    if (name.includes("homework")) return "📚";
    return "✅";
  };

  const getInstructions = () => {
    if (chore.chore_template?.description) {
      return chore.chore_template.description.split("\n").map((line: string, index: number) => 
        <div key={index}>• {line.trim()}</div>
      );
    }
    return <div>• Complete the task as assigned</div>;
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Get browser timezone for consistent week boundary calculation
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/chores/${chore.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kid_id: kid.id, timezone }),
      });

      if (response.ok) {
        setShowCelebration(true);
        chore.status = "completed";
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        setIsCompleting(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsCompleting(false);
    }
  };

  if (showCelebration) {
    return (
      <div class="celebration">
        <div class="celebration-emoji">🎉</div>
        <div class="celebration-points">+{chore.point_value} points!</div>
        <div class="celebration-total">New total: {kid.current_points + chore.point_value} pts</div>
        <div style={{ fontSize: "1rem", color: "var(--color-text-light)" }}>Great job, {kid.name}!</div>
      </div>
    );
  }

  if (chore.status === "completed") {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{getChoreIcon()}</div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Already Completed!</h2>
        <div style={{ fontSize: "1.125rem", color: "var(--color-success)", marginBottom: "2rem" }}>
          You earned {chore.point_value} points
        </div>
        <a href="/kid/dashboard" class="btn btn-primary">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{getChoreIcon()}</div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        {chore.chore_template?.name || "Chore"}
      </h2>
      <div style={{ fontSize: "1.25rem", color: "var(--color-accent)", fontWeight: "600", marginBottom: "2rem" }}>
        Worth {chore.point_value} points
      </div>

      <div class="card" style={{ textAlign: "left", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Instructions:</h3>
        <div style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--color-text)" }}>
          {getInstructions()}
        </div>
      </div>

      <button
        onClick={handleComplete}
        disabled={isCompleting}
        class="btn btn-primary"
        style={{ fontSize: "1.125rem", padding: "1.25rem", width: "100%", opacity: isCompleting ? 0.7 : 1 }}
      >
        {isCompleting ? "Completing..." : `✓ I Did This! (+${chore.point_value} points)`}
      </button>
    </div>
  );
}