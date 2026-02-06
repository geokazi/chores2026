/**
 * ParentRewards - Catalog management + fulfillment + goal boosting
 * ~450 lines, 3 sections: Pending | Catalog | Kids' Goals
 */

import { useState } from "preact/hooks";
import type { AvailableReward, RewardPurchase, SavingsGoal } from "../lib/types/finance.ts";
import { trackInteraction } from "../lib/utils/track-interaction.ts";

interface KidWithGoals {
  id: string;
  name: string;
  avatar_emoji: string;
  goals: SavingsGoal[];
}

interface Props {
  catalog: AvailableReward[];
  pendingPurchases: RewardPurchase[];
  kidsWithGoals: KidWithGoals[];
  familyId: string;
  currentProfileId: string;
}

const ICONS = ["🎬", "🍕", "🎮", "📱", "🛒", "🎁", "🏖️", "🎪", "📚", "🎨"];
const CATEGORIES = ["entertainment", "gaming", "food", "activities", "other"] as const;

// Starter rewards for empty state - popular family rewards (1 pt = $1)
const STARTER_REWARDS = [
  { name: "Movie Night Pick", icon: "🎬", pointCost: 5, category: "entertainment" as const, description: "Choose the family movie" },
  { name: "Extra Screen Time", icon: "🎮", pointCost: 5, category: "gaming" as const, description: "1 hour of extra gaming/TV" },
  { name: "Pizza Topping Choice", icon: "🍕", pointCost: 3, category: "food" as const, description: "Pick your favorite toppings" },
  { name: "Store Trip ($10)", icon: "🛒", pointCost: 10, category: "other" as const, description: "Pick something under $10" },
];

export default function ParentRewards({
  catalog: initialCatalog,
  pendingPurchases: initialPending,
  kidsWithGoals: initialKids,
  familyId,
  currentProfileId,
}: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [pending, setPending] = useState(initialPending);
  const [kidsGoals, setKidsGoals] = useState(initialKids);

  // Create name lookup map from kidsWithGoals
  const kidNames = new Map(initialKids.map(k => [k.id, k.name]));
  const [activeTab, setActiveTab] = useState<"pending" | "catalog" | "goals">(
    initialPending.length > 0 ? "pending" : "catalog"
  );

  // Modal states
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingReward, setEditingReward] = useState<AvailableReward | null>(null);
  const [boostingGoal, setBoostingGoal] = useState<{ kid: KidWithGoals; goal: SavingsGoal } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  // Form state for add/edit reward
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    icon: "🎁",
    pointCost: 100,
    category: "other" as typeof CATEGORIES[number],
  });

  const [boostAmount, setBoostAmount] = useState(50);

  // Inline point editing for starter rewards
  const [editingStarterName, setEditingStarterName] = useState<string | null>(null);
  const [starterPointOverrides, setStarterPointOverrides] = useState<Record<string, number>>({});

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const handleFulfill = async (purchaseId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/rewards/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId, fulfilledByProfileId: currentProfileId }),
      });
      if (res.ok) {
        setPending(pending.filter(p => p.id !== purchaseId));
        setMessage("Marked as fulfilled!");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (e) {
      console.error("Fulfill error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveReward = async () => {
    if (!rewardForm.name || rewardForm.pointCost <= 0) return;
    setIsProcessing(true);

    const payload = {
      ...rewardForm,
      id: editingReward?.id || crypto.randomUUID(),
      isActive: true,
      familyId,
    };

    try {
      const res = await fetch("/api/rewards/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingReward) {
          setCatalog(catalog.map(r => r.id === data.reward.id ? data.reward : r));
        } else {
          setCatalog([...catalog, data.reward]);
        }
        closeRewardModal();
        setMessage(editingReward ? "Reward updated!" : "Reward added!");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (e) {
      console.error("Save reward error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/rewards/catalog?rewardId=${rewardId}&familyId=${familyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCatalog(catalog.filter(r => r.id !== rewardId));
        setMessage("Reward removed");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBoost = async () => {
    if (!boostingGoal || boostAmount <= 0) return;
    setIsProcessing(true);

    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "boost",
          goalId: boostingGoal.goal.id,
          profileId: boostingGoal.kid.id,
          amount: boostAmount,
          boosterId: currentProfileId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setKidsGoals(kidsGoals.map(kid => {
          if (kid.id !== boostingGoal.kid.id) return kid;
          return {
            ...kid,
            goals: kid.goals.map(g => g.id === data.goal.id ? data.goal : g),
          };
        }));
        setBoostingGoal(null);
        setMessage(`Boosted ${boostingGoal.kid.name}'s goal by ${boostAmount} pts!`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (e) {
      console.error("Boost error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditReward = (reward: AvailableReward) => {
    setRewardForm({
      name: reward.name,
      description: reward.description || "",
      icon: reward.icon,
      pointCost: reward.pointCost,
      category: reward.category as typeof CATEGORIES[number],
    });
    setEditingReward(reward);
  };

  const closeRewardModal = () => {
    setShowAddReward(false);
    setEditingReward(null);
    setRewardForm({ name: "", description: "", icon: "🎁", pointCost: 100, category: "other" });
  };

  // Quick add starter with custom points (inline editing)
  const handleQuickAddStarter = async (starter: typeof STARTER_REWARDS[number]) => {
    setIsProcessing(true);
    const customPoints = starterPointOverrides[starter.name] ?? starter.pointCost;

    const payload = {
      id: crypto.randomUUID(),
      name: starter.name,
      description: starter.description,
      icon: starter.icon,
      pointCost: customPoints,
      category: starter.category,
      isActive: true,
      familyId,
    };

    try {
      const res = await fetch("/api/rewards/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCatalog([...catalog, data.reward]);
        // Clear the override for this starter
        const newOverrides = { ...starterPointOverrides };
        delete newOverrides[starter.name];
        setStarterPointOverrides(newOverrides);
        setEditingStarterName(null);
        setMessage(`Added "${starter.name}" (${customPoints} pts)!`);
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (e) {
      console.error("Quick add error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle inline point change for starter
  const handleStarterPointChange = (starterName: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setStarterPointOverrides({ ...starterPointOverrides, [starterName]: numValue });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div class="parent-rewards">
      {/* Success message */}
      {message && <div class="success-toast">{message}</div>}

      {/* Tab navigation */}
      <div class="tabs">
        <button
          class={`tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => { trackInteraction("reward_tab", { tab: "pending" }); setActiveTab("pending"); }}
        >
          📋 Pending {pending.length > 0 && <span class="badge">{pending.length}</span>}
        </button>
        <button
          class={`tab ${activeTab === "catalog" ? "active" : ""}`}
          onClick={() => { trackInteraction("reward_tab", { tab: "catalog" }); setActiveTab("catalog"); }}
        >
          🎁 Catalog
        </button>
        <button
          class={`tab ${activeTab === "goals" ? "active" : ""}`}
          onClick={() => { trackInteraction("reward_tab", { tab: "goals" }); setActiveTab("goals"); }}
        >
          🎯 Goals
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* PENDING TAB */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div class="section">
          <h3>Rewards to Give</h3>
          <div class="info-box">
            <strong>How it works:</strong> When kids claim a reward, it appears here.
            Points are only deducted when you tap "Mark Done" after delivering the reward.
          </div>
          {pending.length === 0 ? (
            <p class="empty">All caught up! No rewards owed right now.</p>
          ) : (
            <div class="list">
              {pending.map(p => {
                const kidName = kidNames.get(p.profileId) || "Someone";
                const rewardName = p.rewardName || "Reward";
                return (
                  <div key={p.id} class="purchase-card">
                    <span class="icon">{p.rewardIcon || "🎁"}</span>
                    <div class="info">
                      <div class="name"><strong>{kidName}</strong> claimed {rewardName}</div>
                      <div class="meta">{p.pointCost} pts • {new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button
                      class="fulfill-btn"
                      onClick={() => handleFulfill(p.id)}
                      disabled={isProcessing}
                      title="Click when you've delivered this reward"
                    >
                      Mark Done
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* CATALOG TAB */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeTab === "catalog" && (
        <div class="section">
          <div class="section-header">
            <h3>Rewards Catalog</h3>
            <button class="add-btn" onClick={() => setShowAddReward(true)}>+ Add</button>
          </div>

          <div class="info-box">
            <strong>How it works:</strong> Add rewards your kids can claim with their points.
            Pick from popular options below, or tap "+ Add" to create your own.
          </div>

          {/* Family's rewards - kids can claim these */}
          {catalog.length > 0 && (
            <>
              <p class="group-label">✅ Your Family's Rewards <span class="group-hint">— kids can claim these</span></p>
              <div class="list">
                {catalog.map(r => (
                  <div key={r.id} class="reward-card">
                    <span class="icon">{r.icon}</span>
                    <div class="info">
                      <div class="name">{r.name}</div>
                      <div class="meta">{r.pointCost} pts • {r.category}</div>
                    </div>
                    <div class="actions">
                      <button class="edit-btn" onClick={() => openEditReward(r)}>✏️</button>
                      <button class="del-btn" onClick={() => handleDeleteReward(r.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Show starter rewards that aren't already in catalog */}
          {(() => {
            const catalogNames = new Set(catalog.map(r => r.name.toLowerCase()));
            const availableStarters = STARTER_REWARDS.filter(
              s => !catalogNames.has(s.name.toLowerCase())
            );

            if (availableStarters.length === 0) return null;

            return (
              <div class="starter-section">
                <p class="group-label">
                  {catalog.length > 0
                    ? "➕ Popular Rewards to Add"
                    : "✨ Popular Rewards to Get Started"}
                  <span class="group-hint"> — tap to customize points, then add</span>
                </p>
                <div class="starter-list">
                  {availableStarters.map(starter => {
                    const isEditing = editingStarterName === starter.name;
                    const currentPoints = starterPointOverrides[starter.name] ?? starter.pointCost;

                    return (
                      <div key={starter.name} class="starter-card">
                        <span class="icon">{starter.icon}</span>
                        <div class="info">
                          <div class="name">{starter.name}</div>
                          <div class="meta points-row">
                            {isEditing ? (
                              <>
                                <input
                                  type="number"
                                  class="inline-points-input"
                                  value={currentPoints}
                                  onInput={(e) => handleStarterPointChange(starter.name, (e.target as HTMLInputElement).value)}
                                  onBlur={() => setEditingStarterName(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingStarterName(null);
                                  }}
                                  min="1"
                                  autoFocus
                                />
                                <span> pts</span>
                              </>
                            ) : (
                              <span
                                class="editable-points"
                                onClick={() => setEditingStarterName(starter.name)}
                                title="Tap to change points"
                              >
                                {currentPoints} pts ✏️
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          class="quick-add-btn"
                          onClick={() => handleQuickAddStarter(starter)}
                          disabled={isProcessing}
                        >
                          + Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* GOALS TAB */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeTab === "goals" && (
        <div class="section">
          <h3>Kids' Savings Goals</h3>
          {kidsGoals.every(k => k.goals.length === 0) ? (
            <div class="empty-goals">
              <p class="empty-icon">🎯</p>
              <p class="empty-title">No goals yet</p>
              <p class="empty-desc">
                Sit down with your kids and help them set a savings goal!<br />
                Go to <strong>🎯 My Goals</strong> on their dashboard together.
              </p>
              <p class="empty-hint">
                💡 Tip: Let them pick what they're excited about — gaming 🎮, electronics 📱, or experiences 🎢
              </p>
            </div>
          ) : (
            kidsGoals.map(kid => kid.goals.length > 0 && (
              <div key={kid.id} class="kid-goals">
                <div class="kid-header">
                  <span>{kid.avatar_emoji} {kid.name}</span>
                </div>
                {kid.goals.filter(g => !g.isAchieved).map(goal => (
                  <div key={goal.id} class="goal-card">
                    <span class="icon">{goal.icon}</span>
                    <div class="info">
                      <div class="name">{goal.name}</div>
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                        />
                      </div>
                      <div class="meta">
                        {goal.currentAmount} / {goal.targetAmount} pts
                      </div>
                    </div>
                    <button
                      class="boost-btn"
                      onClick={() => { trackInteraction("goal_boost_click"); setBoostingGoal({ kid, goal }); setBoostAmount(50); }}
                    >
                      💪 Boost
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* ADD/EDIT REWARD MODAL */}
      {/* ─────────────────────────────────────────────────────── */}
      {(showAddReward || editingReward) && (
        <div class="modal-overlay" onClick={closeRewardModal}>
          <div class="modal" onClick={e => e.stopPropagation()}>
            <div class="modal-header">
              <h2>{editingReward ? "Edit Reward" : "Add Reward"}</h2>
              <button class="close-btn" onClick={closeRewardModal}>✕</button>
            </div>

            <div class="modal-body">
              <label>Icon</label>
              <div class="icon-grid">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    class={`icon-btn ${rewardForm.icon === icon ? "selected" : ""}`}
                    onClick={() => setRewardForm({ ...rewardForm, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <label>Name</label>
              <input
                type="text"
                value={rewardForm.name}
                onInput={e => setRewardForm({ ...rewardForm, name: (e.target as HTMLInputElement).value })}
                placeholder="e.g., Movie Night Pick"
              />

              <label>Points</label>
              <input
                type="number"
                value={rewardForm.pointCost}
                onInput={e => setRewardForm({ ...rewardForm, pointCost: Number((e.target as HTMLInputElement).value) })}
                min="1"
              />

              <label>Category</label>
              <select
                value={rewardForm.category}
                onChange={e => setRewardForm({ ...rewardForm, category: (e.target as HTMLSelectElement).value as any })}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                class="save-btn"
                onClick={handleSaveReward}
                disabled={isProcessing || !rewardForm.name}
              >
                {isProcessing ? "Saving..." : "Save Reward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* BOOST MODAL */}
      {/* ─────────────────────────────────────────────────────── */}
      {boostingGoal && (
        <div class="modal-overlay" onClick={() => setBoostingGoal(null)}>
          <div class="modal" onClick={e => e.stopPropagation()}>
            <div class="modal-header">
              <h2>Boost Goal</h2>
              <button class="close-btn" onClick={() => setBoostingGoal(null)}>✕</button>
            </div>

            <div class="modal-body center">
              <div class="boost-preview">
                <span class="big-icon">{boostingGoal.goal.icon}</span>
                <div class="goal-name">{boostingGoal.goal.name}</div>
                <div class="kid-name">for {boostingGoal.kid.name}</div>
                <div class="goal-progress">
                  {boostingGoal.goal.currentAmount} / {boostingGoal.goal.targetAmount} pts
                </div>
              </div>

              <label>Boost Amount</label>
              <div class="quick-amounts">
                {[25, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    class={`amt-btn ${boostAmount === amt ? "selected" : ""}`}
                    onClick={() => setBoostAmount(amt)}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={boostAmount}
                onInput={e => setBoostAmount(Number((e.target as HTMLInputElement).value))}
                min="1"
              />

              <button
                class="save-btn"
                onClick={handleBoost}
                disabled={isProcessing || boostAmount <= 0}
              >
                {isProcessing ? "Boosting..." : `Boost ${boostAmount} pts`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .parent-rewards { max-width: 600px; margin: 0 auto; padding: 1rem; }
        .success-toast {
          position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
          background: var(--color-success, #22c55e); color: white;
          padding: 0.75rem 1.5rem; border-radius: 8px; z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } }

        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .tab {
          flex: 1; padding: 0.75rem; border: none; border-radius: 8px;
          background: var(--color-card, #fff); cursor: pointer;
          font-size: 0.875rem; transition: all 0.2s;
        }
        .tab.active { background: var(--color-primary, #10b981); color: white; }
        .tab .badge {
          background: #ef4444; color: white; border-radius: 10px;
          padding: 0.125rem 0.5rem; font-size: 0.75rem; margin-left: 0.25rem;
        }

        .section { background: var(--color-card, #fff); border-radius: 12px; padding: 1rem; }
        .section h3 { margin: 0 0 1rem; font-size: 1rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .section-header h3 { margin: 0; }
        .add-btn {
          background: var(--color-primary, #10b981); color: white;
          border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;
        }

        .empty { color: #888; text-align: center; padding: 2rem; }
        .info-box {
          background: #e0f2fe; color: #0369a1; padding: 0.75rem 1rem;
          border-radius: 8px; font-size: 0.8125rem; margin-bottom: 1rem;
          line-height: 1.4;
        }
        .info-box strong { color: #0c4a6e; }

        /* Group labels for catalog sections */
        .group-label {
          font-weight: 600; color: #333; margin: 1rem 0 0.5rem; font-size: 0.9375rem;
        }
        .group-label:first-of-type { margin-top: 0; }
        .group-hint { font-weight: 400; color: #888; font-size: 0.8125rem; }

        /* Starter rewards section */
        .starter-section { padding: 0.5rem 0; margin-top: 0.5rem; }
        .starter-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .starter-card {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.625rem 0.75rem; background: var(--color-bg, #f0fdf4);
          border-radius: 8px; border: 1px dashed #c6e7d9;
        }
        .quick-add-btn {
          background: var(--color-primary, #10b981); color: white;
          border: none; padding: 0.375rem 0.75rem; border-radius: 6px;
          font-size: 0.8125rem; cursor: pointer; white-space: nowrap;
        }
        .quick-add-btn:disabled { opacity: 0.5; }
        .starter-footer { color: #888; font-size: 0.8125rem; margin-top: 1rem; text-align: center; }

        /* Inline point editing */
        .points-row { display: flex; align-items: center; gap: 0.25rem; }
        .editable-points {
          cursor: pointer; color: #059669; font-weight: 500;
          padding: 0.125rem 0.25rem; border-radius: 4px;
          transition: background 0.15s;
        }
        .editable-points:hover { background: rgba(16, 185, 129, 0.1); }
        .inline-points-input {
          width: 50px; padding: 0.25rem 0.375rem; border: 1px solid #10b981;
          border-radius: 4px; font-size: 0.75rem; text-align: center;
        }
        .inline-points-input:focus { outline: none; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }

        /* Empty goals state */
        .empty-goals { text-align: center; padding: 1.5rem; }
        .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .empty-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: #333; }
        .empty-desc { color: #666; line-height: 1.5; margin-bottom: 1rem; }
        .empty-hint { color: #888; font-size: 0.8125rem; }

        .list { display: flex; flex-direction: column; gap: 0.75rem; }
        .purchase-card, .reward-card, .goal-card {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem; background: var(--color-bg, #f0fdf4); border-radius: 8px;
        }
        .icon { font-size: 1.5rem; }
        .info { flex: 1; }
        .name { font-weight: 600; }
        .meta { font-size: 0.75rem; color: #666; }

        .fulfill-btn, .boost-btn {
          background: var(--color-primary, #10b981); color: white;
          border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer;
          font-size: 0.875rem;
        }
        .fulfill-btn:disabled { opacity: 0.5; }

        .actions { display: flex; gap: 0.25rem; }
        .edit-btn, .del-btn {
          background: transparent; border: none; cursor: pointer; font-size: 1rem;
          padding: 0.25rem;
        }

        .kid-goals { margin-bottom: 1rem; }
        .kid-header { font-weight: 600; margin-bottom: 0.5rem; }
        .progress-bar {
          height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;
          margin: 0.25rem 0;
        }
        .progress-fill {
          height: 100%; background: var(--color-primary, #10b981);
          transition: width 0.3s ease;
        }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal {
          background: white; border-radius: 12px; width: 90%; max-width: 400px;
          max-height: 90vh; overflow-y: auto;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem; border-bottom: 1px solid #eee;
        }
        .modal-header h2 { margin: 0; font-size: 1.125rem; }
        .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
        .modal-body { padding: 1rem; }
        .modal-body label { display: block; margin: 0.75rem 0 0.25rem; font-size: 0.875rem; color: #666; }
        .modal-body input, .modal-body select {
          width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;
          font-size: 1rem;
        }
        .icon-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .icon-btn {
          width: 40px; height: 40px; border: 2px solid #eee; border-radius: 8px;
          background: white; font-size: 1.25rem; cursor: pointer;
        }
        .icon-btn.selected { border-color: var(--color-primary, #10b981); background: #f0fdf4; }
        .save-btn {
          width: 100%; padding: 1rem; margin-top: 1rem;
          background: var(--color-primary, #10b981); color: white;
          border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .save-btn:disabled { opacity: 0.5; }

        .center { text-align: center; }
        .boost-preview { margin-bottom: 1rem; }
        .big-icon { font-size: 3rem; }
        .goal-name { font-size: 1.25rem; font-weight: 600; }
        .kid-name { color: #666; }
        .goal-progress { margin-top: 0.5rem; color: #888; }
        .quick-amounts { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 0.5rem; }
        .amt-btn {
          padding: 0.5rem 1rem; border: 2px solid #eee; border-radius: 8px;
          background: white; cursor: pointer;
        }
        .amt-btn.selected { border-color: var(--color-primary, #10b981); background: #f0fdf4; }
      `}</style>
    </div>
  );
}
