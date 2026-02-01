/**
 * BalanceCards Island - Per-kid balance display with Pay Out
 * P2: Balance & Pay Out feature
 */

import { useState } from "preact/hooks";
import type { BalanceInfo, DailyEarning, RewardPurchase } from "../lib/types/finance.ts";

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

interface Props {
  balances: BalanceInfo[];
  recentPurchases: RewardPurchase[];
  dollarValuePerPoint: number;
  members?: FamilyMember[];
}

export default function BalanceCards({ balances, recentPurchases, dollarValuePerPoint, members = [] }: Props) {
  // Create a map of profileId -> name for quick lookup
  const memberNames = new Map(members.map(m => [m.id, m.name]));
  const [selectedKid, setSelectedKid] = useState<BalanceInfo | null>(null);
  const [showPayOut, setShowPayOut] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [parentPin, setParentPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePayOut = async () => {
    if (!selectedKid || !payoutAmount || !parentPin) return;

    const amount = parseInt(payoutAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > selectedKid.currentPoints) {
      setError("Amount exceeds available balance");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedKid.profileId,
          amount,
          parentPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Payout failed");
        return;
      }

      setSuccess(
        `Paid out $${(amount * dollarValuePerPoint).toFixed(2)} to ${selectedKid.profileName}!`,
      );
      setShowPayOut(false);
      setPayoutAmount("");
      setParentPin("");
      setSelectedKid(null);

      // Refresh after a moment to show updated balances
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDollars = (points: number) => {
    return `$${(points * dollarValuePerPoint).toFixed(2)}`;
  };

  if (balances.length === 0) {
    return (
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <p>No kids in family yet</p>
        <p class="empty-hint">Add kids in Settings to track their earnings</p>
      </div>
    );
  }

  return (
    <div class="balance-cards">
      {success && (
        <div class="success-message">
          ✅ {success}
        </div>
      )}

      <div class="cards-grid">
        {balances.map((balance) => (
          <div key={balance.profileId} class="balance-card">
            <div class="card-header">
              <span class="avatar">{balance.avatarEmoji}</span>
              <span class="name">{balance.profileName}</span>
            </div>

            <div class="balance-amount">
              <span class="points">{balance.currentPoints} pts</span>
              <span class="dollars">{formatDollars(balance.currentPoints)}</span>
            </div>

            <div class="daily-earnings">
              <div class="daily-grid">
                {balance.dailyEarnings.map((day: DailyEarning) => {
                  const isFuture = new Date(day.date) > new Date();
                  return (
                    <div class={`daily-cell ${day.points > 0 ? "has-points" : ""} ${isFuture ? "future" : ""}`} key={day.date}>
                      <span class="daily-points">{isFuture ? "—" : day.points > 0 ? `+${day.points}` : "0"}</span>
                      <span class="daily-name">{day.dayName}</span>
                    </div>
                  );
                })}
              </div>
              <div class="weekly-total">
                <span>This Week</span>
                <span class="weekly-value">+{balance.weeklyEarnings} pts</span>
              </div>
            </div>

            <button
              class="payout-btn"
              onClick={() => {
                setSelectedKid(balance);
                setShowPayOut(true);
                setError("");
                setSuccess("");
              }}
              disabled={balance.currentPoints === 0}
            >
              💵 Pay Out
            </button>
          </div>
        ))}
      </div>

      {/* Recent Purchases Section */}
      {recentPurchases.length > 0 && (
        <div class="recent-section">
          <h3>Recent Rewards Claimed</h3>
          <div class="purchases-list">
            {recentPurchases.map((purchase) => {
              const claimerName = memberNames.get(purchase.profileId) || "Someone";
              const rewardName = purchase.rewardName || "Reward";
              return (
                <div key={purchase.id} class="purchase-item">
                  <span class="purchase-icon">{purchase.rewardIcon || "🎁"}</span>
                  <div class="purchase-info">
                    <span class="purchase-name">
                      <strong>{claimerName}</strong> claimed {rewardName}
                    </span>
                    <span class="purchase-date">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span class="purchase-cost">{purchase.pointCost} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pay Out Modal */}
      {showPayOut && selectedKid && (
        <div class="modal-overlay" onClick={() => setShowPayOut(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>Pay Out</h2>
              <button class="close-btn" onClick={() => setShowPayOut(false)}>
                ✕
              </button>
            </div>

            <div class="modal-body">
              <div class="kid-info">
                <span class="avatar large">{selectedKid.avatarEmoji}</span>
                <span class="name">{selectedKid.profileName}</span>
              </div>

              <div class="current-balance">
                <span>Available Balance</span>
                <span class="balance-value">
                  {selectedKid.currentPoints} pts ({formatDollars(selectedKid.currentPoints)})
                </span>
              </div>

              <div class="form-group">
                <label>Amount (in points)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onInput={(e) => setPayoutAmount((e.target as HTMLInputElement).value)}
                  placeholder="Enter amount"
                  min="1"
                  max={selectedKid.currentPoints}
                />
                {payoutAmount && (
                  <span class="dollar-preview">
                    = {formatDollars(parseInt(payoutAmount, 10) || 0)}
                  </span>
                )}
              </div>

              <div class="form-group">
                <label>Parent PIN</label>
                <input
                  type="password"
                  value={parentPin}
                  onInput={(e) => setParentPin((e.target as HTMLInputElement).value)}
                  placeholder="Enter your PIN"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>

              {error && <div class="error-message">{error}</div>}

              <button
                class="confirm-btn"
                onClick={handlePayOut}
                disabled={isProcessing || !payoutAmount || !parentPin}
              >
                {isProcessing ? "Processing..." : "Confirm Pay Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .balance-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cards-grid {
          display: grid;
          gap: 1rem;
        }
        .balance-card {
          background: var(--color-card);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: var(--shadow-card);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .avatar {
          font-size: 2rem;
        }
        .avatar.large {
          font-size: 3rem;
        }
        .name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .balance-amount {
          background: var(--color-bg);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
          margin-bottom: 1rem;
        }
        .points {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .dollars {
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
        .daily-earnings {
          margin-bottom: 1rem;
        }
        .daily-grid {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .daily-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 0.25rem;
          background: rgba(var(--color-primary-rgb), 0.04);
          border-radius: 8px;
          transition: all 0.15s ease;
        }
        .daily-cell.has-points {
          background: rgba(var(--color-primary-rgb), 0.12);
        }
        .daily-cell.future {
          opacity: 0.4;
        }
        .daily-points {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-light);
          line-height: 1.2;
        }
        .daily-cell.has-points .daily-points {
          color: var(--color-primary);
        }
        .daily-name {
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--color-text-light);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-top: 0.125rem;
        }
        .weekly-total {
          display: flex;
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px solid var(--color-border);
          font-size: 0.875rem;
        }
        .weekly-value {
          color: var(--color-success);
          font-weight: 600;
        }
        .payout-btn {
          width: 100%;
          padding: 0.75rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .payout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .payout-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .recent-section {
          margin-top: 1.5rem;
        }
        .recent-section h3 {
          font-size: 1rem;
          margin-bottom: 0.75rem;
          color: var(--color-text-light);
        }
        .purchases-list {
          background: var(--color-card);
          border-radius: 8px;
          overflow: hidden;
        }
        .purchase-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .purchase-item:last-child {
          border-bottom: none;
        }
        .purchase-icon {
          font-size: 1.25rem;
        }
        .purchase-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .purchase-name {
          font-weight: 500;
        }
        .purchase-date {
          font-size: 0.75rem;
          color: var(--color-text-light);
        }
        .purchase-cost {
          color: var(--color-text-light);
          font-size: 0.9rem;
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
          border-radius: 12px;
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
          padding: 0.25rem;
        }
        .modal-body {
          padding: 1.25rem;
        }
        .kid-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .current-balance {
          background: var(--color-bg);
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .balance-value {
          font-weight: 600;
          color: var(--color-primary);
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
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          text-align: center;
        }
        .success-message {
          background: #f0fdf4;
          color: #16a34a;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          text-align: center;
        }
        .confirm-btn {
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
        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
