/**
 * SavingsGoals Island - Kid-facing savings goals with progress
 * P4: Savings Goals feature
 */

import { useState } from "preact/hooks";
import type { BalanceInfo, SavingsGoal } from "../lib/types/finance.ts";

interface Props {
  goals: SavingsGoal[];
  balance: BalanceInfo | null;
  dollarValuePerPoint: number;
  profileId: string;
}

const CATEGORIES = [
  { value: "toys", label: "Toys", icon: "🧸" },
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "experiences", label: "Experiences", icon: "🎢" },
  { value: "books", label: "Books", icon: "📚" },
  { value: "other", label: "Other", icon: "🎯" },
];

const ICONS = ["🎯", "🎮", "📱", "🧸", "📚", "🎢", "⚽", "🎨", "🎸", "🚀"];

export default function SavingsGoals({
  goals,
  balance,
  dollarValuePerPoint,
  profileId,
}: Props) {
  const [localGoals, setLocalGoals] = useState(goals);
  const [currentBalance, setCurrentBalance] = useState(balance?.currentPoints || 0);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTo, setShowAddTo] = useState<SavingsGoal | null>(null);
  const [showCelebration, setShowCelebration] = useState<SavingsGoal | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SavingsGoal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Create goal form state
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newCategory, setNewCategory] = useState<string>("other");
  const [newTargetDate, setNewTargetDate] = useState("");

  // Add to goal state
  const [addAmount, setAddAmount] = useState("");

  const handleCreateGoal = async () => {
    if (!newName || !newTarget) return;

    const target = parseInt(newTarget, 10);
    if (isNaN(target) || target <= 0) {
      setError("Please enter a valid target amount");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          name: newName,
          targetAmount: target,
          icon: newIcon,
          category: newCategory,
          targetDate: newTargetDate || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create goal");
        return;
      }

      setLocalGoals([...localGoals, data.goal]);
      setShowCreate(false);
      resetForm();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToGoal = async () => {
    if (!showAddTo || !addAmount) return;

    const amount = parseInt(addAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > currentBalance) {
      setError("Not enough points in your balance");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          goalId: showAddTo.id,
          amount,
          isBoost: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add to goal");
        return;
      }

      // Update local state
      const updatedGoals = localGoals.map((g) =>
        g.id === showAddTo.id ? data.goal : g
      );
      setLocalGoals(updatedGoals);
      setCurrentBalance(currentBalance - amount);
      setShowAddTo(null);
      setAddAmount("");

      // Check if goal was achieved
      if (data.goal.isAchieved) {
        setShowCelebration(data.goal);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!showDeleteConfirm) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/goals?goalId=${showDeleteConfirm.id}&profileId=${profileId}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        setLocalGoals(localGoals.filter((g) => g.id !== showDeleteConfirm.id));
        setShowDeleteConfirm(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete goal");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewTarget("");
    setNewIcon("🎯");
    setNewCategory("other");
    setNewTargetDate("");
    setError("");
  };

  const formatDollars = (points: number) => {
    return `$${(points * dollarValuePerPoint).toFixed(2)}`;
  };

  const getProgress = (goal: SavingsGoal) => {
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  };

  const activeGoals = localGoals.filter((g) => !g.isAchieved);
  const achievedGoals = localGoals.filter((g) => g.isAchieved);

  return (
    <div class="savings-goals">
      {/* Balance Display */}
      <div class="balance-banner">
        <div class="balance-label">💰 Available to Save</div>
        <div class="balance-amount">{currentBalance} pts</div>
        <div class="balance-dollars">{formatDollars(currentBalance)}</div>
      </div>

      {/* Active Goals */}
      <div class="section">
        <div class="section-header">
          <span>🎯 My Goals</span>
          <button class="add-goal-btn" onClick={() => setShowCreate(true)}>
            + New Goal
          </button>
        </div>

        {activeGoals.length === 0 ? (
          <div class="empty-goals">
            <p>No goals yet!</p>
            <p class="hint">Create a goal to start saving for something special</p>
          </div>
        ) : (
          <div class="goals-list">
            {activeGoals.map((goal) => (
              <div key={goal.id} class="goal-card">
                <div class="goal-header">
                  <span class="goal-icon">{goal.icon}</span>
                  <div class="goal-info">
                    <div class="goal-name">{goal.name}</div>
                    {goal.targetDate && (
                      <div class="goal-date">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    class="delete-btn"
                    onClick={() => setShowDeleteConfirm(goal)}
                    title="Delete goal"
                  >
                    ✕
                  </button>
                </div>

                <div class="progress-container">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      style={{ width: `${getProgress(goal)}%` }}
                    />
                  </div>
                  <div class="progress-text">
                    <span>{goal.currentAmount} / {goal.targetAmount} pts</span>
                    <span>{Math.round(getProgress(goal))}%</span>
                  </div>
                </div>

                <div class="goal-footer">
                  <span class="remaining">
                    {goal.targetAmount - goal.currentAmount} pts to go
                  </span>
                  <button
                    class="add-btn"
                    onClick={() => {
                      setShowAddTo(goal);
                      setError("");
                    }}
                    disabled={currentBalance === 0}
                  >
                    Add Points
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div class="section">
          <div class="section-header">
            <span>🏆 Achieved</span>
          </div>
          <div class="achieved-list">
            {achievedGoals.map((goal) => (
              <div key={goal.id} class="achieved-card">
                <span class="achieved-icon">{goal.icon}</span>
                <div class="achieved-info">
                  <div class="achieved-name">{goal.name}</div>
                  <div class="achieved-date">
                    {goal.achievedAt
                      ? `Achieved ${new Date(goal.achievedAt).toLocaleDateString()}`
                      : "Achieved!"}
                  </div>
                </div>
                <span class="achieved-badge">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreate && (
        <div class="modal-overlay" onClick={() => setShowCreate(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>Create New Goal</h2>
              <button class="close-btn" onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  value={newName}
                  onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                  placeholder="e.g., Nintendo Game"
                />
              </div>

              <div class="form-group">
                <label>Target Amount (pts)</label>
                <input
                  type="number"
                  value={newTarget}
                  onInput={(e) => setNewTarget((e.target as HTMLInputElement).value)}
                  placeholder="e.g., 5000"
                  min="1"
                />
                {newTarget && (
                  <span class="dollar-preview">
                    = {formatDollars(parseInt(newTarget, 10) || 0)}
                  </span>
                )}
              </div>

              <div class="form-group">
                <label>Icon</label>
                <div class="icon-picker">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      class={`icon-btn ${newIcon === icon ? "selected" : ""}`}
                      onClick={() => setNewIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div class="form-group">
                <label>Target Date (optional)</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onInput={(e) => setNewTargetDate((e.target as HTMLInputElement).value)}
                />
              </div>

              {error && <div class="error-message">{error}</div>}

              <button
                class="submit-btn"
                onClick={handleCreateGoal}
                disabled={isProcessing || !newName || !newTarget}
              >
                {isProcessing ? "Creating..." : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Goal Modal */}
      {showAddTo && (
        <div class="modal-overlay" onClick={() => setShowAddTo(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>Add to Goal</h2>
              <button class="close-btn" onClick={() => setShowAddTo(null)}>
                ✕
              </button>
            </div>

            <div class="modal-body">
              <div class="goal-preview">
                <span class="goal-icon large">{showAddTo.icon}</span>
                <div class="goal-name">{showAddTo.name}</div>
                <div class="goal-progress">
                  {showAddTo.currentAmount} / {showAddTo.targetAmount} pts
                </div>
              </div>

              <div class="balance-info">
                <span>Available:</span>
                <span>{currentBalance} pts</span>
              </div>

              <div class="form-group">
                <label>Amount to Add</label>
                <input
                  type="number"
                  value={addAmount}
                  onInput={(e) => setAddAmount((e.target as HTMLInputElement).value)}
                  placeholder="Enter amount"
                  min="1"
                  max={Math.min(currentBalance, showAddTo.targetAmount - showAddTo.currentAmount)}
                />
              </div>

              {error && <div class="error-message">{error}</div>}

              <button
                class="submit-btn"
                onClick={handleAddToGoal}
                disabled={isProcessing || !addAmount}
              >
                {isProcessing ? "Adding..." : "Add to Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div class="modal-overlay" onClick={() => setShowCelebration(null)}>
          <div class="modal celebration" onClick={(e) => e.stopPropagation()}>
            <div class="celebration-content">
              <div class="celebration-emoji">🎉</div>
              <div class="celebration-title">Goal Achieved!</div>
              <div class="achieved-goal">
                <span class="goal-icon large">{showCelebration.icon}</span>
                <div class="goal-name">{showCelebration.name}</div>
              </div>
              <div class="celebration-message">
                You saved {showCelebration.targetAmount} points!
              </div>
              <button class="done-btn" onClick={() => setShowCelebration(null)}>
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div class="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>Delete Goal?</h2>
              <button class="close-btn" onClick={() => setShowDeleteConfirm(null)}>
                ✕
              </button>
            </div>

            <div class="modal-body">
              <div class="delete-preview">
                <span class="goal-icon large">{showDeleteConfirm.icon}</span>
                <div class="goal-name">{showDeleteConfirm.name}</div>
                <div class="goal-progress">
                  {showDeleteConfirm.currentAmount} / {showDeleteConfirm.targetAmount} pts saved
                </div>
              </div>

              <p class="delete-warning">
                This will permanently delete this goal. Any points you've saved will remain in your balance.
              </p>

              {error && <div class="error-message">{error}</div>}

              <button
                class="delete-confirm-btn"
                onClick={handleDeleteGoal}
                disabled={isProcessing}
              >
                {isProcessing ? "Deleting..." : "Yes, Delete Goal"}
              </button>

              <button
                class="cancel-btn"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .savings-goals {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .balance-banner {
          background: linear-gradient(135deg, var(--color-primary) 0%, #059669 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
        }
        .balance-label {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
        }
        .balance-amount {
          font-size: 2rem;
          font-weight: 700;
        }
        .balance-dollars {
          font-size: 1rem;
          opacity: 0.9;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .add-goal-btn {
          padding: 0.5rem 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .empty-goals {
          text-align: center;
          padding: 2rem;
          background: var(--color-card);
          border-radius: 12px;
          color: var(--color-text-light);
        }
        .empty-goals .hint {
          font-size: 0.875rem;
          opacity: 0.8;
        }
        .goals-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .goal-card {
          background: var(--color-card);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: var(--shadow-card);
        }
        .goal-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .goal-icon {
          font-size: 2rem;
        }
        .goal-icon.large {
          font-size: 3rem;
        }
        .goal-info {
          flex: 1;
        }
        .goal-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .goal-date {
          font-size: 0.8rem;
          color: var(--color-text-light);
        }
        .delete-btn {
          background: none;
          border: none;
          color: var(--color-text-light);
          cursor: pointer;
          padding: 0.25rem;
        }
        .progress-container {
          margin-bottom: 1rem;
        }
        .progress-bar {
          height: 12px;
          background: var(--color-bg);
          border-radius: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
          border-radius: 6px;
          transition: width 0.3s ease;
        }
        .progress-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--color-text-light);
          margin-top: 0.5rem;
        }
        .goal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .remaining {
          font-size: 0.9rem;
          color: var(--color-text-light);
        }
        .add-btn {
          padding: 0.5rem 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .achieved-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .achieved-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--color-card);
          padding: 1rem;
          border-radius: 8px;
        }
        .achieved-icon {
          font-size: 1.5rem;
        }
        .achieved-info {
          flex: 1;
        }
        .achieved-name {
          font-weight: 500;
        }
        .achieved-date {
          font-size: 0.75rem;
          color: var(--color-text-light);
        }
        .achieved-badge {
          color: var(--color-success);
          font-size: 1.25rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: var(--color-card);
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 1.25rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 1rem;
        }
        .dollar-preview {
          display: block;
          margin-top: 0.25rem;
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
        .icon-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .icon-btn {
          width: 44px;
          height: 44px;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-card);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn.selected {
          border-color: var(--color-primary);
          background: var(--color-bg);
        }
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-btn:disabled {
          opacity: 0.5;
        }
        .goal-preview {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .goal-progress {
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
        .balance-info {
          display: flex;
          justify-content: space-between;
          background: var(--color-bg);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .modal.celebration {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        .celebration-content {
          padding: 2rem 1.5rem;
          text-align: center;
        }
        .celebration-emoji {
          font-size: 4rem;
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }
        .celebration-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-success);
          margin: 1rem 0;
        }
        .achieved-goal {
          margin: 1rem 0;
        }
        .celebration-message {
          color: var(--color-text-light);
          margin-bottom: 1.5rem;
        }
        .done-btn {
          width: 100%;
          padding: 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .delete-preview {
          text-align: center;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 12px;
          margin-bottom: 1rem;
        }
        .delete-warning {
          color: var(--color-text-light);
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .delete-confirm-btn {
          width: 100%;
          padding: 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 0.75rem;
        }
        .delete-confirm-btn:disabled {
          opacity: 0.5;
        }
        .cancel-btn {
          width: 100%;
          padding: 1rem;
          background: transparent;
          color: var(--color-text-light);
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
