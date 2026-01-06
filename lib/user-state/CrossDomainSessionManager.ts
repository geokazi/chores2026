/**
 * Cross-Domain Session Manager for Chores2026
 * Simple implementation for session management
 */

export interface CrossDomainSession {
  sessionId: string;
  createdAt: number;
  lastActive: number;
  syncedFrom: "parent_domain" | "local_creation" | "cookie";
  isUnified: boolean;
}

export class CrossDomainSessionManager {
  private static instance: CrossDomainSessionManager;
  private static readonly SESSION_KEY = "chores2026_unified_session";
  private static readonly SYNC_STATUS_KEY = "chores2026_cross_domain_sync";

  private constructor() {}

  public static getInstance(): CrossDomainSessionManager {
    if (!CrossDomainSessionManager.instance) {
      CrossDomainSessionManager.instance = new CrossDomainSessionManager();
    }
    return CrossDomainSessionManager.instance;
  }

  /**
   * Get unified session ID
   */
  public getUnifiedSessionId(): string {
    // Check local unified session
    const localSession = this.getLocalSession();
    if (localSession) {
      return localSession.sessionId;
    }

    // Fallback: create new session
    return this.createLocalSession();
  }

  /**
   * Check if session is synced
   */
  public isSessionSynced(): boolean {
    return true; // Simple implementation - always consider synced
  }

  /**
   * Wait for session sync (simple stub)
   */
  public async waitForSync(): Promise<string> {
    return this.getUnifiedSessionId();
  }

  /**
   * Get local session from storage
   */
  private getLocalSession(): CrossDomainSession | null {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(
          CrossDomainSessionManager.SESSION_KEY,
        );
        if (stored) {
          const session = JSON.parse(stored);
          // Check if session is still valid (24 hours)
          if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
            return session;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to get local session:", e);
    }
    return null;
  }

  /**
   * Create new local session
   */
  private createLocalSession(): string {
    const sessionId = `chores2026_${Date.now()}_${
      Math.random().toString(36).substr(2, 9)
    }`;
    const session: CrossDomainSession = {
      sessionId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      syncedFrom: "local_creation",
      isUnified: true,
    };

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          CrossDomainSessionManager.SESSION_KEY,
          JSON.stringify(session),
        );
      }
    } catch (e) {
      console.warn("Failed to store session:", e);
    }

    return sessionId;
  }
}

// Export singleton instance
export const crossDomainSessionManager = CrossDomainSessionManager
  .getInstance();
