/**
 * Kid Session Management for Conditional PIN Authentication
 * 
 * Manages kid profile sessions when family PIN requirement is enabled.
 * Provides localStorage-based session validation with database fallback.
 */

import { ChoreGamiSession } from "./session.ts";

export interface KidSession {
  kidId: string;
  kidName: string;
  pinValidated: boolean;
  validatedAt: number;
  expiresAt: number;
  deviceId: string;
}

export interface KidProfile {
  id: string;
  name: string;
  role: string;
  family_id: string;
  pin_hash?: string;
}

// Session duration: 30 minutes
const SESSION_DURATION_MS = 30 * 60 * 1000;
const STORAGE_KEY_PREFIX = "kid_session_";

/**
 * Check if kid PIN authentication is required for this family
 */
export function isPinRequiredForFamily(family: any): boolean {
  return family?.children_pins_enabled === true;
}

/**
 * Validate if a kid session is currently active and valid
 */
export function validateKidSession(
  kidId: string, 
  familyPinsEnabled: boolean
): boolean {
  // If PINs are disabled for family, always allow access
  if (!familyPinsEnabled) {
    return true;
  }

  try {
    const sessionData = getKidSessionFromStorage(kidId);
    if (!sessionData) {
      return false;
    }

    // Check if session has expired
    const now = Date.now();
    if (now > sessionData.expiresAt) {
      clearKidSession(kidId);
      return false;
    }

    // Extend session if still valid
    extendKidSession(kidId);
    return sessionData.pinValidated;
  } catch (error) {
    console.error("Error validating kid session:", error);
    return false;
  }
}

/**
 * Create a new kid session after successful PIN validation
 */
export function createKidSession(kidProfile: KidProfile): boolean {
  try {
    const now = Date.now();
    const deviceId = getDeviceId();
    
    const session: KidSession = {
      kidId: kidProfile.id,
      kidName: kidProfile.name,
      pinValidated: true,
      validatedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      deviceId,
    };

    const sessionKey = `${STORAGE_KEY_PREFIX}${kidProfile.id}`;
    localStorage.setItem(sessionKey, JSON.stringify(session));

    console.log(`✅ Kid session created for ${kidProfile.name}`, {
      kidId: kidProfile.id,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error creating kid session:", error);
    return false;
  }
}

/**
 * Clear a specific kid's session
 */
export function clearKidSession(kidId: string): void {
  try {
    const sessionKey = `${STORAGE_KEY_PREFIX}${kidId}`;
    localStorage.removeItem(sessionKey);
    console.log(`🧹 Kid session cleared for kidId: ${kidId}`);
  } catch (error) {
    console.error("Error clearing kid session:", error);
  }
}

/**
 * Clear all kid sessions (e.g., when parent disables PINs)
 */
export function clearAllKidSessions(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log("🧹 All kid sessions cleared");
  } catch (error) {
    console.error("Error clearing all kid sessions:", error);
  }
}

/**
 * Extend an existing kid session (reset expiration)
 */
export function extendKidSession(kidId: string): boolean {
  try {
    const sessionData = getKidSessionFromStorage(kidId);
    if (!sessionData) {
      return false;
    }

    sessionData.expiresAt = Date.now() + SESSION_DURATION_MS;
    
    const sessionKey = `${STORAGE_KEY_PREFIX}${kidId}`;
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    
    return true;
  } catch (error) {
    console.error("Error extending kid session:", error);
    return false;
  }
}

/**
 * Get the currently active kid session info
 */
export function getActiveKidSession(): KidSession | null {
  try {
    const keys = Object.keys(localStorage);
    const sessionKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    
    for (const key of sessionKeys) {
      const sessionData = JSON.parse(localStorage.getItem(key) || "{}");
      if (sessionData.pinValidated && Date.now() < sessionData.expiresAt) {
        return sessionData;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting active kid session:", error);
    return null;
  }
}

/**
 * Check if any kid session is currently active
 */
export function hasActiveKidSession(): boolean {
  return getActiveKidSession() !== null;
}

/**
 * Get kid session data from localStorage
 */
function getKidSessionFromStorage(kidId: string): KidSession | null {
  try {
    const sessionKey = `${STORAGE_KEY_PREFIX}${kidId}`;
    const sessionData = localStorage.getItem(sessionKey);
    if (!sessionData) {
      return null;
    }
    
    return JSON.parse(sessionData) as KidSession;
  } catch (error) {
    console.error("Error parsing kid session data:", error);
    return null;
  }
}

/**
 * Generate a simple device identifier for session tracking
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Utility to check if we're in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Server-side helper to determine if kid access should be allowed
 * Used in route handlers where localStorage isn't available
 */
export function shouldRequirePinValidation(
  parentSession: ChoreGamiSession,
  kidId: string
): boolean {
  if (!parentSession.isAuthenticated || !parentSession.family) {
    return true; // Require auth first
  }

  // Check if family has PIN requirement enabled
  // This would typically come from database query in the route handler
  return parentSession.family?.children_pins_enabled === true;
}