/**
 * RewardsCatalog Island - Kid-facing rewards catalog with claim flow
 * P3: Rewards Marketplace feature
 *
 * Uses positive framing: "Claim" not "Buy", green colors, no red
 */

import { useState } from "preact/hooks";
import type { AvailableReward, BalanceInfo, RewardPurchase } from "../lib/types/finance.ts";

interface Props {
  rewards: AvailableReward[];
  balance: BalanceInfo | null;
  recentPurchases: RewardPurchase[];
  dollarValuePerPoint: number;
  profileId: string;
}

export default function RewardsCatalog({
  rewards,
  balance,
  recentPurchases,
  dollarValuePerPoint,
  profileId,
}: Props) {
  const [selectedReward, setSelectedReward] = useState<AvailableReward | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [claimedReward, setClaimedReward] = useState<AvailableReward | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [currentBalance, setCurrentBalance] = useState(balance?.currentPoints || 0);

  const handleClaim = async () => {
    if (!selectedReward) return;

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: selectedReward.id,
          profileId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to claim reward");
        return;
      }

      // Success!
      setCurrentBalance(data.newBalance);
      setClaimedReward(selectedReward);
      setShowConfirm(false);
      setShowCelebration(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDollars = (points: number) => {
    return `$${(points * dollarValuePerPoint).toFixed(2)}`;
  };

  const canAfford = (cost: number) => currentBalance >= cost;

  if (rewards.length === 0) {
    return (
      <div class="empty-state">
        <div class="empty-icon">🎁</div>
        <p>No rewards available yet</p>
        <p class="empty-hint">Ask a parent to add some rewards!</p>
      </div>
    );
  }

  return (
    <div class="rewards-catalog">
      {/* Balance Display */}
      <div class="balance-banner">
        <div class="balance-label">💰 Your Balance</div>
        <div class="balance-amount">{currentBalance} pts</div>
        <div class="balance-dollars">{formatDollars(currentBalance)}</div>
      </div>

      {/* Rewards Grid */}
      <div class="section-header">🎁 Available Rewards</div>
      <div class="rewards-grid">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            class={`reward-card ${!canAfford(reward.pointCost) ? "insufficient" : ""}`}
          >
            <div class="reward-icon">{reward.icon}</div>
            <div class="reward-info">
              <div class="reward-name">{reward.name}</div>
              {reward.description && (
                <div class="reward-description">{reward.description}</div>
              )}
            </div>
            <div class="reward-footer">
              <span class="reward-cost">{reward.pointCost} pts</span>
              <button
                class="claim-btn"
                onClick={() => {
                  setSelectedReward(reward);
                  setShowConfirm(true);
                  setError("");
                }}
                disabled={!canAfford(reward.pointCost)}
              >
                {canAfford(reward.pointCost) ? "Claim" : "Not enough pts"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Claims */}
      {recentPurchases.length > 0 && (
        <div class="recent-section">
          <div class="section-header">✨ Recently Claimed</div>
          <div class="claims-list">
            {recentPurchases.map((purchase) => (
              <div key={purchase.id} class="claim-item">
                <span class="claim-icon">{purchase.rewardIcon || "🎁"}</span>
                <span class="claim-name">{purchase.rewardName}</span>
                <span class="claim-date">
                  {new Date(purchase.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && selectedReward && (
        <div class="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-content">
              <div class="confirm-header">Claim this reward?</div>

              <div class="confirm-reward">
                <div class="confirm-icon">{selectedReward.icon}</div>
                <div class="confirm-name">{selectedReward.name}</div>
                <div class="confirm-cost">{selectedReward.pointCost} pts</div>
              </div>

              <div class="balance-preview">
                <div class="preview-row">
                  <span>Your balance:</span>
                  <span>{currentBalance} pts</span>
                </div>
                <div class="preview-row after">
                  <span>After claim:</span>
                  <span>{currentBalance - selectedReward.pointCost} pts</span>
                </div>
              </div>

              {error && <div class="error-message">{error}</div>}

              <button
                class="confirm-btn primary"
                onClick={handleClaim}
                disabled={isProcessing}
              >
                {isProcessing ? "Claiming..." : "Yes, Claim!"}
              </button>

              <button
                class="confirm-btn secondary"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && claimedReward && (
        <div class="modal-overlay" onClick={() => setShowCelebration(false)}>
          <div class="modal celebration" onClick={(e) => e.stopPropagation()}>
            <div class="celebration-content">
              <div class="celebration-emoji">🎉</div>
              <div class="celebration-title">Reward Claimed!</div>

              <div class="claimed-reward">
                <div class="claimed-icon">{claimedReward.icon}</div>
                <div class="claimed-name">{claimedReward.name}</div>
              </div>

              <div class="celebration-note">
                Ask a parent to fulfill your reward
              </div>

              <button
                class="done-btn"
                onClick={() => {
                  setShowCelebration(false);
                  setClaimedReward(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rewards-catalog {
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
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .rewards-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .reward-card {
          background: var(--color-card);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .reward-card.insufficient {
          opacity: 0.7;
        }
        .reward-icon {
          font-size: 2rem;
        }
        .reward-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .reward-description {
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
        .reward-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }
        .reward-cost {
          font-weight: 600;
          color: var(--color-primary);
        }
        .claim-btn {
          padding: 0.5rem 1.25rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .claim-btn:disabled {
          background: var(--color-text-light);
          opacity: 0.6;
          cursor: not-allowed;
        }
        .claim-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .recent-section {
          margin-top: 1rem;
        }
        .claims-list {
          background: var(--color-card);
          border-radius: 8px;
          margin-top: 0.75rem;
        }
        .claim-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .claim-item:last-child {
          border-bottom: none;
        }
        .claim-icon {
          font-size: 1.25rem;
        }
        .claim-name {
          flex: 1;
          font-weight: 500;
        }
        .claim-date {
          color: var(--color-text-light);
          font-size: 0.8rem;
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
          max-width: 360px;
          overflow: hidden;
        }
        .modal-content {
          padding: 1.5rem;
          text-align: center;
        }
        .confirm-header {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .confirm-reward {
          background: var(--color-bg);
          padding: 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
        }
        .confirm-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .confirm-name {
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .confirm-cost {
          color: var(--color-primary);
          font-weight: 600;
        }
        .balance-preview {
          background: var(--color-bg);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .preview-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
        }
        .preview-row.after {
          font-weight: 600;
          color: var(--color-primary);
        }
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .confirm-btn {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 0.75rem;
        }
        .confirm-btn.primary {
          background: var(--color-primary);
          color: white;
        }
        .confirm-btn.secondary {
          background: transparent;
          color: var(--color-text-light);
        }
        .confirm-btn:disabled {
          opacity: 0.5;
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
        .claimed-reward {
          background: white;
          padding: 1rem;
          border-radius: 12px;
          margin: 1rem 0;
        }
        .claimed-icon {
          font-size: 2.5rem;
        }
        .claimed-name {
          font-weight: 600;
          margin-top: 0.5rem;
        }
        .celebration-note {
          color: var(--color-text-light);
          font-size: 0.9rem;
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
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-text-light);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .empty-hint {
          font-size: 0.875rem;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
