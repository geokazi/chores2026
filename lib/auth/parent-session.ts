/**
 * Parent Session Management for PIN Authentication
 * 
 * Manages parent PIN session elevation for sensitive operations.
 * Based on successful kid session pattern but for parent authentication.
 */

export interface ParentSession {
  parentId: string;
  parentName: string;
  pinValidated: boolean;
  validatedAt: number;
  expiresAt: number;
  deviceId: string;
}

export interface ParentProfile {
  id: string;
  name: string;
  role: string;
  family_id: string;
  pin_hash?: string;
}

// Session duration: 5 minutes (shorter than kid sessions for security)
// NOTE: Session is also cleared when switching to kid profiles for enhanced security
const SESSION_DURATION_MS = 5 * 60 * 1000;
const STORAGE_KEY_PREFIX = "parent_session_";

/**
 * Validate if a parent session is currently elevated and valid
 */
export function validateParentSession(parentId: string): boolean {
  try {
    const sessionData = getParentSessionFromStorage(parentId);
    if (!sessionData) {
      return false;
    }

    // Check if session has expired
    const now = Date.now();
    if (now > sessionData.expiresAt) {
      clearParentSession(parentId);
      return false;
    }

    // Extend session if still valid (like kid sessions)
    extendParentSession(parentId);
    return sessionData.pinValidated;
  } catch (error) {
    console.error("Error validating parent session:", error);
    return false;
  }
}

/**
 * Create a new parent session after successful PIN validation
 */
export function createParentSession(parentProfile: ParentProfile): boolean {
  try {
    const now = Date.now();
    const deviceId = getDeviceId();
    
    const session: ParentSession = {
      parentId: parentProfile.id,
      parentName: parentProfile.name,
      pinValidated: true,
      validatedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      deviceId,
    };

    const sessionKey = `${STORAGE_KEY_PREFIX}${parentProfile.id}`;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    // Also set the legacy elevation key that ParentPinGate checks
    sessionStorage.setItem('parent_elevated_until', session.expiresAt.toString());

    console.log(`✅ Parent session created for ${parentProfile.name}`, {
      parentId: parentProfile.id,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error creating parent session:", error);
    return false;
  }
}

/**
 * Clear a specific parent's session
 */
export function clearParentSession(parentId: string): void {
  try {
    const sessionKey = `${STORAGE_KEY_PREFIX}${parentId}`;
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem('parent_elevated_until');
    console.log(`🧹 Parent session cleared for parentId: ${parentId}`);
  } catch (error) {
    console.error("Error clearing parent session:", error);
  }
}

/**
 * Clear all parent sessions
 */
export function clearAllParentSessions(): void {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    sessionStorage.removeItem('parent_elevated_until');
    console.log("🧹 All parent sessions cleared");
  } catch (error) {
    console.error("Error clearing all parent sessions:", error);
  }
}

/**
 * Clear parent session when switching to kid profile (security feature)
 * This ensures parents must re-enter PIN when returning from kid access
 */
export function clearParentSessionOnKidAccess(reason: string = "kid profile accessed"): void {
  try {
    const activeSession = getActiveParentSession();
    if (activeSession) {
      console.log(`🔒 Clearing parent session: ${reason}`);
      clearParentSession(activeSession.parentId);
      
      // Also clear the legacy elevation key
      sessionStorage.removeItem('parent_elevated_until');
      
      console.log("✅ Parent session cleared - PIN required for next parent access");
    }
  } catch (error) {
    console.error("Error clearing parent session on kid access:", error);
  }
}

/**
 * Extend an existing parent session (reset expiration)
 */
export function extendParentSession(parentId: string): boolean {
  try {
    const sessionData = getParentSessionFromStorage(parentId);
    if (!sessionData) {
      return false;
    }

    sessionData.expiresAt = Date.now() + SESSION_DURATION_MS;
    
    const sessionKey = `${STORAGE_KEY_PREFIX}${parentId}`;
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
    
    // Update legacy elevation key
    sessionStorage.setItem('parent_elevated_until', sessionData.expiresAt.toString());
    
    return true;
  } catch (error) {
    console.error("Error extending parent session:", error);
    return false;
  }
}

/**
 * Get the currently active parent session info
 */
export function getActiveParentSession(): ParentSession | null {
  try {
    const keys = Object.keys(sessionStorage);
    const sessionKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
    
    for (const key of sessionKeys) {
      const sessionData = JSON.parse(sessionStorage.getItem(key) || "{}");
      if (sessionData.pinValidated && Date.now() < sessionData.expiresAt) {
        return sessionData;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting active parent session:", error);
    return null;
  }
}

/**
 * Check if any parent session is currently active
 */
export function hasActiveParentSession(): boolean {
  return getActiveParentSession() !== null;
}

/**
 * Get parent session data from sessionStorage
 */
function getParentSessionFromStorage(parentId: string): ParentSession | null {
  try {
    const sessionKey = `${STORAGE_KEY_PREFIX}${parentId}`;
    const sessionData = sessionStorage.getItem(sessionKey);
    if (!sessionData) {
      return null;
    }
    
    return JSON.parse(sessionData) as ParentSession;
  } catch (error) {
    console.error("Error parsing parent session data:", error);
    return null;
  }
}

/**
 * Generate a cryptographically secure device identifier for session tracking
 * Uses Web Crypto API (crypto.randomUUID) for secure random generation
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${crypto.randomUUID()}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Utility to check if we're in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}