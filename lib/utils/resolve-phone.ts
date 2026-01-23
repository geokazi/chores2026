/**
 * Phone resolution utility for legacy mealplanner users.
 *
 * Users registered via phone may have their number stored as a placeholder
 * email (e.g., "+16179030249@phone.mealplanner.internal") with user.phone = null.
 * This utility extracts the phone from either field.
 */

interface PhoneUser {
  phone?: string | null;
  email?: string | null;
}

/** Extract phone number from user.phone or @phone. placeholder email. */
export function resolvePhone(user: PhoneUser, verifiedPhone?: string): string | null {
  if (user.phone) return user.phone;
  if (verifiedPhone) return verifiedPhone;
  if (user.email) {
    const match = user.email.match(/^(\+?\d+)@phone\./);
    if (match) return match[1];
  }
  return null;
}

/** True if user registered via phone (has phone field, verified phone, or @phone. email). */
export function isPhoneSignup(user: PhoneUser, verifiedPhone?: string): boolean {
  return !!resolvePhone(user, verifiedPhone);
}

/** True if user has a real email (not a phone placeholder). */
export function hasRealEmail(email: string | null | undefined): boolean {
  return !!email && !/\@phone\./i.test(email);
}
