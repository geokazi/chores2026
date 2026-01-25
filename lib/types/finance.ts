/**
 * Shared types for P2 (Balance), P3 (Rewards), P4 (Savings Goals)
 * Financial education features for ChoreGami 2026
 */

// ============ P2: Balance & Pay Out ============

export interface BalanceInfo {
  profileId: string;
  profileName: string;
  avatarEmoji: string;
  currentPoints: number;
  dollarValue: number;
  weeklyEarnings: number;
  choreEarnings: number;
}

export interface PayOutRequest {
  profileId: string;
  amount: number; // In points
  parentPin: string;
}

export interface PayOutResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

// ============ P3: Rewards Marketplace ============

export interface AvailableReward {
  id: string;
  name: string;
  description?: string;
  icon: string; // Emoji, default '🎁'
  pointCost: number;
  category: "gaming" | "entertainment" | "food" | "activities" | "other";
  isActive: boolean;
  maxPerWeek?: number;
  maxPerMonth?: number;
  createdAt: string;
}

export interface RewardPurchase {
  id: string;
  profileId: string;
  rewardId: string;
  transactionId: string;
  pointCost: number;
  status: "purchased" | "fulfilled" | "cancelled";
  rewardName?: string;
  rewardIcon?: string;
  createdAt: string;
  fulfilledAt?: string;
}

export interface ClaimRewardPayload {
  rewardId: string;
  profileId: string;
  familyId: string;
}

export interface ClaimResult {
  success: boolean;
  purchase?: RewardPurchase;
  newBalance?: number;
  error?: string;
}

// ============ P4: Savings Goals ============

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  icon: string; // Default '🎯'
  category: "toys" | "electronics" | "experiences" | "books" | "other";
  targetDate?: string;
  isAchieved: boolean;
  achievedAt?: string;
  createdAt: string;
}

export interface CreateGoalPayload {
  name: string;
  description?: string;
  targetAmount: number;
  icon?: string;
  category?: SavingsGoal["category"];
  targetDate?: string;
}

export interface BoostGoalPayload {
  goalId: string;
  profileId: string;
  amount: number;
  boosterId: string; // Parent who's boosting
}

export interface GoalResult {
  success: boolean;
  goal?: SavingsGoal;
  error?: string;
}

// ============ Finance Settings ============

export interface FinanceSettings {
  dollarValuePerPoint: number; // Default 1.00 (1 point = $1)
  weeklyAllowanceCents?: number; // Optional base allowance
  payoutRequiresPin: boolean;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  dollarValuePerPoint: 1.0,
  payoutRequiresPin: true,
};
