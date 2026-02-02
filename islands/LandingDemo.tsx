/**
 * LandingDemo - Simplified inline demo for landing page
 * Shows one kid's chores with interactive completion
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

const INITIAL_CHORES: DemoChore[] = [
  { id: "1", name: "Make Your Bed", icon: "🛏️", points: 10, status: "completed" },
  { id: "2", name: "Feed the Dog", icon: "🐕", points: 15, status: "pending" },
  { id: "3", name: "Do Homework", icon: "📚", points: 20, status: "pending" },
];

export default function LandingDemo() {
  const [chores, setChores] = useState<DemoChore[]>(INITIAL_CHORES);
  const [points, setPoints] = useState(245);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);

  const completedCount = chores.filter(c => c.status === "completed").length;

  const handleComplete = (choreId: string) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore || chore.status === "completed" || isAnimating) return;

    setIsAnimating(choreId);

    setTimeout(() => {
      setChores(prev => prev.map(c =>
        c.id === choreId ? { ...c, status: "completed" } : c
      ));
      setPoints(prev => prev + chore.points);
      setIsAnimating(null);
      triggerCelebration("chore_complete");
    }, 300);
  };

  return (
    <div class="landing-demo">
      {/* Kid info */}
      <div class="demo-kid">
        <div class="kid-avatar">👧</div>
        <div class="kid-info">
          <span class="kid-name">Emma's Chores</span>
          <span class="kid-progress">{completedCount}/{chores.length} done today</span>
        </div>
        <div class="kid-points">
          <span class="points-value">{points}</span>
          <span class="points-label">pts</span>
        </div>
      </div>

      {/* Chore list */}
      <div class="demo-chores">
        {chores.map(chore => (
          <div
            key={chore.id}
            class={`demo-chore ${chore.status === "completed" ? "completed" : ""}`}
          >
            <button
              class="chore-checkbox"
              onClick={() => handleComplete(chore.id)}
              disabled={chore.status === "completed" || isAnimating === chore.id}
            >
              {isAnimating === chore.id ? "⏳" : chore.status === "completed" ? "✓" : "○"}
            </button>
            <span class="chore-icon">{chore.icon}</span>
            <span class="chore-name">{chore.name}</span>
            <span class="chore-points">+{chore.points}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div class="demo-hint">
        💡 Tap the circles to complete chores and earn points!
      </div>

      {/* CTA */}
      <a href="/register" class="demo-cta">
        Create Your Family →
      </a>

      <style>{`
        .landing-demo {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .demo-kid {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
          border-radius: 12px;
        }
        .kid-avatar {
          font-size: 2rem;
        }
        .kid-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .kid-name {
          font-weight: 600;
          color: var(--color-text, #064e3b);
        }
        .kid-progress {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .kid-points {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }
        .points-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary, #10b981);
        }
        .points-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .demo-chores {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .demo-chore {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .demo-chore.completed {
          background: #f0fdf4;
          opacity: 0.8;
        }
        .demo-chore:not(.completed):hover {
          background: #f3f4f6;
        }

        .chore-checkbox {
          width: 32px;
          height: 32px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #9ca3af;
        }
        .chore-checkbox:hover:not(:disabled) {
          border-color: var(--color-primary, #10b981);
          color: var(--color-primary, #10b981);
        }
        .demo-chore.completed .chore-checkbox {
          background: var(--color-primary, #10b981);
          border-color: var(--color-primary, #10b981);
          color: white;
        }
        .chore-checkbox:disabled {
          cursor: default;
        }

        .chore-icon {
          font-size: 1.25rem;
        }
        .chore-name {
          flex: 1;
          font-weight: 500;
          color: var(--color-text, #064e3b);
        }
        .demo-chore.completed .chore-name {
          text-decoration: line-through;
          color: #9ca3af;
        }
        .chore-points {
          font-weight: 600;
          color: var(--color-primary, #10b981);
          font-size: 0.875rem;
        }
        .demo-chore.completed .chore-points {
          color: #9ca3af;
        }

        .demo-hint {
          text-align: center;
          font-size: 0.8rem;
          color: #6b7280;
          padding: 0.5rem;
          background: #fffbeb;
          border-radius: 8px;
        }

        .demo-cta {
          display: block;
          text-align: center;
          padding: 0.875rem;
          background: var(--color-primary, #10b981);
          color: white;
          font-weight: 600;
          text-decoration: none;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .demo-cta:hover {
          background: #059669;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
