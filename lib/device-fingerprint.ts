/**
 * Device Fingerprint - Fraud prevention for trial abuse
 *
 * NOTE: collectDeviceFingerprint is CLIENT-SIDE ONLY (used in islands).
 * The implementation is in DeviceFingerprintCollector.tsx island.
 * This file only contains the server-side validation function.
 *
 * ~15 lines
 */

/** Server-side hash verification (for use in API routes) */
export function isValidDeviceHash(hash: string): boolean {
  // SHA-256 produces 64 hex characters
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
}
