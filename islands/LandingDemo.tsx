/**
 * LandingDemo - Smart Rotation demo for landing page
 * Shows two kids with rotating chores + points that update
 * Key differentiator: automatic weekly rotation for fairness
 */

import { useState } from "preact/hooks";
import { triggerCelebration } from "./ConfettiTrigger.tsx";

interface DemoChore {
  id: string;
  name: string;
  icon: string;
  points: number;
  completed: boolean;
}

interface KidData {
  name: string;
  emoji: string;
  points: number;
  chores: DemoChore[];
}

// Week A chores - Emma gets dishes/trash, Jake gets vacuum/bathroom
const WEEK_A: { emma: DemoChore[]; jake: DemoChore[] } = {
  emma: [
    { id: "e1", name: "Dishes", icon: "🍽️", points: 10, completed: false },
    { id: "e2", name: "Trash", icon: "🗑️", points: 5, completed: true },
    { id: "e3", name: "Feed dog", icon: "🐕", points: 5, completed: false },
  ],
  jake: [
    { id: "j1", name: "Vacuum", icon: "🧹", points: 15, completed: false },
    { id: "j2", name: "Bathroom", icon: "🚿", points: 10, completed: false },
    { id: "j3", name: "Trash", icon: "🗑️", points: 5, completed: true },
  ],
};

// Week B chores - SWAPPED for fairness
const WEEK_B: { emma: DemoChore[]; jake: DemoChore[] } = {
  emma: [
    { id: "e1b", name: "Vacuum", icon: "🧹", points: 15, completed: false },
    { id: "e2b", name: "Bathroom", icon: "🚿", points: 10, completed: false },
    { id: "e3b", name: "Trash", icon: "🗑️", points: 5, completed: false },
  ],
  jake: [
    { id: "j1b", name: "Dishes", icon: "🍽️", points: 10, completed: false },
    { id: "j2b", name: "Feed dog", icon: "🐕", points: 5, completed: false },
    { id: "j3b", name: "Trash", icon: "🗑️", points: 5, completed: true },
  ],
};

export default function LandingDemo() {
  const [week, setWeek] = useState<"A" | "B">("A");
  const [emmaPoints, setEmmaPoints] = useState(125);
  const [jakePoints, setJakePoints] = useState(98);
  const [emmaChores, setEmmaChores] = useState<DemoChore[]>(WEEK_A.emma);
  const [jakeChores, setJakeChores] = useState<DemoChore[]>(WEEK_A.jake);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const handleWeekToggle = (newWeek: "A" | "B") => {
    if (newWeek === week || isSwapping) return;

    setIsSwapping(true);

    setTimeout(() => {
      setWeek(newWeek);
      if (newWeek === "A") {
        setEmmaChores(WEEK_A.emma.map(c => ({ ...c, completed: false })));
        setJakeChores(WEEK_A.jake.map(c => ({ ...c, completed: false })));
      } else {
        setEmmaChores(WEEK_B.emma.map(c => ({ ...c, completed: false })));
        setJakeChores(WEEK_B.jake.map(c => ({ ...c, completed: false })));
      }
      setIsSwapping(false);
    }, 300);
  };

  const handleComplete = (kid: "emma" | "jake", choreId: string) => {
    if (isAnimating || isSwapping) return;

    const chores = kid === "emma" ? emmaChores : jakeChores;
    const setChores = kid === "emma" ? setEmmaChores : setJakeChores;
    const setPoints = kid === "emma" ? setEmmaPoints : setJakePoints;

    const chore = chores.find(c => c.id === choreId);
    if (!chore || chore.completed) return;

    setIsAnimating(choreId);

    setTimeout(() => {
      setChores(prev => prev.map(c =>
        c.id === choreId ? { ...c, completed: true } : c
      ));
      setPoints(prev => prev + chore.points);
      setIsAnimating(null);
      triggerCelebration("chore_complete");
    }, 300);
  };

  return (
    <div class="rotation-demo">
      {/* Week Toggle */}
      <div class="week-toggle">
        <button
          class={`week-tab ${week === "A" ? "active" : ""}`}
          onClick={() => handleWeekToggle("A")}
        >
          This Week
        </button>
        <button
          class={`week-tab ${week === "B" ? "active" : ""}`}
          onClick={() => handleWeekToggle("B")}
        >
          Next Week
        </button>
      </div>

      {/* Kids side by side */}
      <div class={`kids-container ${isSwapping ? "swapping" : ""}`}>
        {/* Emma */}
        <div class="kid-column">
          <div class="kid-header">
            <span class="kid-emoji">👧</span>
            <span class="kid-name">Emma</span>
            <span class="kid-points">{emmaPoints} pts</span>
          </div>
          <div class="kid-chores">
            {emmaChores.map(chore => (
              <div
                key={chore.id}
                class={`chore-row ${chore.completed ? "completed" : ""}`}
                onClick={() => handleComplete("emma", chore.id)}
              >
                <span class="chore-check">
                  {isAnimating === chore.id ? "⏳" : chore.completed ? "✓" : "○"}
                </span>
                <span class="chore-icon">{chore.icon}</span>
                <span class="chore-name">{chore.name}</span>
                <span class="chore-pts">+{chore.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jake */}
        <div class="kid-column">
          <div class="kid-header">
            <span class="kid-emoji">👦</span>
            <span class="kid-name">Jake</span>
            <span class="kid-points">{jakePoints} pts</span>
          </div>
          <div class="kid-chores">
            {jakeChores.map(chore => (
              <div
                key={chore.id}
                class={`chore-row ${chore.completed ? "completed" : ""}`}
                onClick={() => handleComplete("jake", chore.id)}
              >
                <span class="chore-check">
                  {isAnimating === chore.id ? "⏳" : chore.completed ? "✓" : "○"}
                </span>
                <span class="chore-icon">{chore.icon}</span>
                <span class="chore-name">{chore.name}</span>
                <span class="chore-pts">+{chore.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rotation hint */}
      <div class="rotation-hint">
        🔄 Tap "Next Week" to see chores rotate automatically
      </div>

      {/* CTA */}
      <a href="/register" class="demo-cta">
        Create your household →
      </a>

      <style>{`
        .rotation-demo {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-x: hidden;
        }

        /* Week Toggle */
        .week-toggle {
          display: flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 4px;
          gap: 4px;
        }
        .week-tab {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #6b7280;
        }
        .week-tab.active {
          background: white;
          color: var(--color-primary, #10b981);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .week-tab:hover:not(.active) {
          color: #374151;
        }

        /* Kids Container */
        .kids-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          transition: opacity 0.3s, transform 0.3s;
        }
        .kids-container.swapping {
          opacity: 0.5;
          transform: scale(0.98);
        }

        /* Kid Column */
        .kid-column {
          background: #f9fafb;
          border-radius: 12px;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
        }
        .kid-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .kid-emoji {
          font-size: 1.25rem;
        }
        .kid-name {
          flex: 1;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text, #064e3b);
        }
        .kid-points {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--color-primary, #10b981);
        }

        /* Chore Rows */
        .kid-chores {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .chore-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.75rem;
        }
        .chore-row:hover:not(.completed) {
          background: #f0fdf4;
          transform: translateX(2px);
        }
        .chore-row.completed {
          opacity: 0.6;
        }
        .chore-check {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.7rem;
          color: #9ca3af;
          flex-shrink: 0;
          background: white;
        }
        .chore-row.completed .chore-check {
          background: var(--color-primary, #10b981);
          border-color: var(--color-primary, #10b981);
          color: white;
        }
        .chore-icon {
          font-size: 0.9rem;
        }
        .chore-name {
          flex: 1;
          color: var(--color-text, #064e3b);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chore-row.completed .chore-name {
          text-decoration: line-through;
          color: #9ca3af;
        }
        .chore-pts {
          font-weight: 600;
          color: var(--color-primary, #10b981);
          font-size: 0.7rem;
        }
        .chore-row.completed .chore-pts {
          color: #9ca3af;
        }

        /* Hint */
        .rotation-hint {
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
          padding: 0.5rem;
          background: #fffbeb;
          border-radius: 8px;
        }

        /* CTA */
        .demo-cta {
          display: block;
          text-align: center;
          padding: 0.75rem;
          background: var(--color-primary, #10b981);
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .demo-cta:hover {
          background: #059669;
          transform: translateY(-2px);
        }

        /* Mobile: stack kids vertically */
        @media (max-width: 500px) {
          .kids-container {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          .kid-column {
            padding: 0.5rem;
          }
          .kid-header {
            margin-bottom: 0.5rem;
            padding-bottom: 0.4rem;
          }
          .kid-chores {
            gap: 0.4rem;
          }
          .chore-row {
            padding: 0.4rem;
          }
        }

        /* Dark mode - manual toggle */
        :root[data-theme-mode="dark"] .week-toggle {
          background: #1e3a5f;
        }
        :root[data-theme-mode="dark"] .week-tab {
          color: #94a3b8;
        }
        :root[data-theme-mode="dark"] .week-tab.active {
          background: #334155;
          color: #60a5fa;
        }
        :root[data-theme-mode="dark"] .week-tab:hover:not(.active) {
          color: #cbd5e1;
        }
        :root[data-theme-mode="dark"] .kid-column {
          background: #1e3a5f;
          border-color: #334155;
        }
        :root[data-theme-mode="dark"] .kid-header {
          border-color: #475569;
        }
        :root[data-theme-mode="dark"] .kid-name {
          color: #f1f5f9;
        }
        :root[data-theme-mode="dark"] .kid-points {
          color: #60a5fa;
        }
        :root[data-theme-mode="dark"] .chore-row {
          background: #0f172a;
        }
        :root[data-theme-mode="dark"] .chore-row:hover:not(.completed) {
          background: #1e293b;
        }
        :root[data-theme-mode="dark"] .chore-check {
          background: #0f172a;
          border-color: #475569;
          color: #64748b;
        }
        :root[data-theme-mode="dark"] .chore-row.completed .chore-check {
          background: #3b82f6;
          border-color: #3b82f6;
        }
        :root[data-theme-mode="dark"] .chore-name {
          color: #f1f5f9;
        }
        :root[data-theme-mode="dark"] .chore-row.completed .chore-name {
          color: #64748b;
        }
        :root[data-theme-mode="dark"] .chore-pts {
          color: #60a5fa;
        }
        :root[data-theme-mode="dark"] .chore-row.completed .chore-pts {
          color: #64748b;
        }
        :root[data-theme-mode="dark"] .rotation-hint {
          background: #1e3a5f;
          color: #94a3b8;
        }
        :root[data-theme-mode="dark"] .demo-cta {
          background: #3b82f6;
        }
        :root[data-theme-mode="dark"] .demo-cta:hover {
          background: #2563eb;
        }

        /* Dark mode - system preference fallback */
        @media (prefers-color-scheme: dark) {
          .week-toggle {
            background: #1e3a5f;
          }
          .week-tab {
            color: #94a3b8;
          }
          .week-tab.active {
            background: #334155;
            color: #60a5fa;
          }
          .week-tab:hover:not(.active) {
            color: #cbd5e1;
          }
          .kid-column {
            background: #1e3a5f;
            border-color: #334155;
          }
          .kid-header {
            border-color: #475569;
          }
          .kid-name {
            color: #f1f5f9;
          }
          .kid-points {
            color: #60a5fa;
          }
          .chore-row {
            background: #0f172a;
          }
          .chore-row:hover:not(.completed) {
            background: #1e293b;
          }
          .chore-check {
            background: #0f172a;
            border-color: #475569;
            color: #64748b;
          }
          .chore-row.completed .chore-check {
            background: #3b82f6;
            border-color: #3b82f6;
          }
          .chore-name {
            color: #f1f5f9;
          }
          .chore-row.completed .chore-name {
            color: #64748b;
          }
          .chore-pts {
            color: #60a5fa;
          }
          .chore-row.completed .chore-pts {
            color: #64748b;
          }
          .rotation-hint {
            background: #1e3a5f;
            color: #94a3b8;
          }
          .demo-cta {
            background: #3b82f6;
          }
          .demo-cta:hover {
            background: #2563eb;
          }
        }

        /* Light mode override when manually selected */
        :root[data-theme-mode="light"] .week-toggle {
          background: #f1f5f9;
        }
        :root[data-theme-mode="light"] .week-tab {
          color: #6b7280;
        }
        :root[data-theme-mode="light"] .week-tab.active {
          background: white;
          color: #10b981;
        }
        :root[data-theme-mode="light"] .kid-column {
          background: #f9fafb;
          border-color: #e5e7eb;
        }
        :root[data-theme-mode="light"] .kid-header {
          border-color: #e5e7eb;
        }
        :root[data-theme-mode="light"] .kid-name {
          color: #064e3b;
        }
        :root[data-theme-mode="light"] .kid-points {
          color: #10b981;
        }
        :root[data-theme-mode="light"] .chore-row {
          background: white;
        }
        :root[data-theme-mode="light"] .chore-check {
          background: white;
          border-color: #d1d5db;
          color: #9ca3af;
        }
        :root[data-theme-mode="light"] .chore-name {
          color: #064e3b;
        }
        :root[data-theme-mode="light"] .chore-pts {
          color: #10b981;
        }
        :root[data-theme-mode="light"] .rotation-hint {
          background: #fffbeb;
          color: #6b7280;
        }
        :root[data-theme-mode="light"] .demo-cta {
          background: #10b981;
        }
      `}</style>
    </div>
  );
}
