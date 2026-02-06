/**
 * Plan Gate - Utilities for checking plan status and template access
 * Includes trial support and Stripe price mapping
 */

export type PlanType = 'free' | 'trial' | 'school_year' | 'summer' | 'full_year';

export type PlanSource = 'trial' | 'stripe' | 'gift' | 'referral_bonus';

export const PLAN_DURATIONS_DAYS: Record<Exclude<PlanType, 'free'>, number> = {
  trial: 15,         // 15-day free trial
  school_year: 300,  // ~10 months
  summer: 90,        // 3 months
  full_year: 365,    // 12 months
};

// Stripe price IDs (set in environment)
export const STRIPE_PRICE_IDS: Record<Exclude<PlanType, 'free' | 'trial'>, string> = {
  summer: Deno.env.get('STRIPE_PRICE_SUMMER') || 'price_summer_placeholder',
  school_year: Deno.env.get('STRIPE_PRICE_SCHOOL_YEAR') || 'price_school_year_placeholder',
  full_year: Deno.env.get('STRIPE_PRICE_FULL_YEAR') || 'price_full_year_placeholder',
};

// Price display values
export const PLAN_PRICES: Record<Exclude<PlanType, 'free' | 'trial'>, { amount: number; perMonth: string }> = {
  summer: { amount: 2999, perMonth: '$10/month' },
  school_year: { amount: 4999, perMonth: '$5/month' },
  full_year: { amount: 7999, perMonth: '$6.67/month' },
};

// Templates that are always free (no plan required)
export const FREE_TEMPLATES = ['daily_basics', 'dynamic_daily'];

export interface PlanInfo {
  type: PlanType;
  expiresAt: Date | null;
  daysRemaining: number | null;
}

export function getPlan(settings: any): PlanInfo {
  const plan = settings?.apps?.choregami?.plan;
  if (!plan?.expires_at) return { type: 'free', expiresAt: null, daysRemaining: null };

  const expiresAt = new Date(plan.expires_at);
  if (expiresAt < new Date()) return { type: 'free', expiresAt: null, daysRemaining: null };

  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { type: plan.type || 'free', expiresAt, daysRemaining };
}

export function hasPaidPlan(settings: any): boolean {
  return getPlan(settings).type !== 'free';
}

export function canAccessTemplate(settings: any, templateKey: string): boolean {
  if (FREE_TEMPLATES.includes(templateKey)) return true;
  return hasPaidPlan(settings);
}

export function calculateNewExpiry(currentSettings: any, planType: Exclude<PlanType, 'free'>): Date {
  const { expiresAt } = getPlan(currentSettings);
  const daysToAdd = PLAN_DURATIONS_DAYS[planType];

  // If existing plan, extend from current expiry; otherwise start from today
  const baseDate = expiresAt && expiresAt > new Date() ? expiresAt : new Date();
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + daysToAdd);

  return newExpiry;
}

/** Check if plan is in trial */
export function isTrialPlan(settings: any): boolean {
  const plan = settings?.apps?.choregami?.plan;
  return plan?.type === 'trial';
}

/** Get trial info */
export interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  isEnding: boolean; // Last 5 days
  isExpired: boolean;
  startedAt: Date | null;
}

export function getTrialInfo(settings: any): TrialInfo {
  const plan = settings?.apps?.choregami?.plan;
  const trial = settings?.apps?.choregami?.trial;

  if (!plan || plan.type !== 'trial') {
    return { isActive: false, daysRemaining: 0, isEnding: false, isExpired: false, startedAt: null };
  }

  const expiresAt = plan.expires_at ? new Date(plan.expires_at) : null;
  const startedAt = trial?.started_at ? new Date(trial.started_at) : null;
  const now = new Date();

  if (!expiresAt) {
    return { isActive: false, daysRemaining: 0, isEnding: false, isExpired: true, startedAt };
  }

  const isExpired = expiresAt < now;
  const daysRemaining = isExpired ? 0 : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isEnding = !isExpired && daysRemaining <= 5;

  return {
    isActive: !isExpired,
    daysRemaining,
    isEnding,
    isExpired,
    startedAt,
  };
}
