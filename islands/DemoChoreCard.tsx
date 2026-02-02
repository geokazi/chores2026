/**
 * DemoChoreCard - Interactive chore card for demo mode
 * No API calls - all state is managed locally for demonstration
 */

import { useState } from "preact/hooks";
import { triggerCelebration } from "./ConfettiTrigger.tsx";

interface DemoChore {
  id: string;
  name: string;
  icon: string;
  points: number;
  status: "pending" | "completed";
}

interface Props {
  chore: DemoChore;
  onComplete: (choreId: string, points: number) => void;
}

const ICON_MAP: Record<string, string> = {
  bed: "\u{1F6CF}\u{FE0F}",
  dog: "\u{1F415}",
  homework: "\u{1F4DA}",
  trash: "\u{1F5D1}\u{FE0F}",
  dishes: "\u{1F37D}\u{FE0F}",
  clean: "\u{1F9F9}",
  laundry: "\u{1F455}",
  default: "\u2705",
};

export default function DemoChoreCard({ chore, onComplete }: Props) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [status, setStatus] = useState(chore.status);

  const getIcon = () => ICON_MAP[chore.icon] || ICON_MAP.default;

  const handleComplete = () => {
    if (status === "completed" || isCompleting) return;

    setIsCompleting(true);

    // Simulate completion with a brief delay
    setTimeout(() => {
      setStatus("completed");
      setIsCompleting(false);
      triggerCelebration("chore_complete");
      onComplete(chore.id, chore.points);
    }, 300);
  };

  return (
    <div
      class={`card chore-card ${status === "completed" ? "completed" : ""}`}
      style={{
        opacity: status === "completed" ? 0.8 : 1,
      }}
    >
      <div class="chore-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            onClick={handleComplete}
            style={{
              fontSize: "1.25rem",
              color: status === "completed" ? "var(--color-success)" : "var(--color-text)",
              cursor: status === "completed" || isCompleting ? "default" : "pointer",
              opacity: isCompleting ? 0.5 : 1,
            }}
          >
            {isCompleting ? "\u23F3" : status === "completed" ? "\u2713" : "\u2610"}
          </span>
          <span style={{ fontSize: "1.5rem" }}>{getIcon()}</span>
          <div>
            <div class="chore-name">{chore.name}</div>
          </div>
        </div>
        <div class="chore-points">+{chore.points} pts</div>
      </div>

      {status === "completed" && (
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

      {status === "pending" && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            marginTop: "0.5rem",
            textAlign: "center",
          }}
        >
          {isCompleting ? "Completing..." : "Tap \u2610 to complete"}
        </div>
      )}
    </div>
  );
}
