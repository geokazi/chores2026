/**
 * Plan Gate - Utilities for checking plan status and template access
 * ~35 lines - Pareto: minimal code for monetization gating
 */

export type PlanType = 'free' | 'school_year' | 'summer' | 'full_year';

export const PLAN_DURATIONS_DAYS: Record<Exclude<PlanType, 'free'>, number> = {
  school_year: 300,  // ~10 months
  summer: 90,        // 3 months
  full_year: 365,    // 12 months
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
