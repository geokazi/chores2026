/**
 * Simple Active User Session Manager  
 * Based on original SessionManager pattern - focused and under 100 lines
 * Stores which family member (kid or parent) is currently "active"
 * Uses browser session ID to prevent conflicts when multiple users use same browser
 */

export class ActiveKidSessionManager {
  private static readonly STORAGE_KEY = "active_profile_session";
  
  /**
   * Get a unique session ID for this browser session
   */
  private static getSessionId(): string {
    if (typeof window === "undefined") return "server";
    
    let sessionId = sessionStorage.getItem("browser_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("browser_session_id", sessionId);
    }
    return sessionId;
  }
  
  /**
   * Set the currently active profile for this browser session
   */
  static setActiveKid(profileId: string, profileName: string): void {
    if (typeof window === "undefined") return;
    
    const sessionId = this.getSessionId();
    const session = {
      profileId,
      profileName,
      activatedAt: Date.now(),
      sessionId,
    };
    
    localStorage.setItem(`${this.STORAGE_KEY}_${sessionId}`, JSON.stringify(session));
    console.log(`✅ Active profile set: ${profileName} (session: ${sessionId.substr(-6)})`);
  }
  
  /**
   * Get the currently active profile ID for this browser session
   */
  static getActiveKidId(): string | null {
    if (typeof window === "undefined") return null;
    
    try {
      const sessionId = this.getSessionId();
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${sessionId}`);
      if (!data) return null;
      
      const session = JSON.parse(data);
      return session.profileId || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Get the currently active profile session info for this browser session
   */
  static getActiveKidSession(): { profileId: string; profileName: string; activatedAt: number; sessionId: string } | null {
    if (typeof window === "undefined") return null;
    
    try {
      const sessionId = this.getSessionId();
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${sessionId}`);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  /**
   * Clear active profile session for this browser session
   */
  static clearActiveKid(): void {
    if (typeof window === "undefined") return;
    
    const sessionId = this.getSessionId();
    localStorage.removeItem(`${this.STORAGE_KEY}_${sessionId}`);
    console.log(`🧹 Active profile session cleared (session: ${sessionId.substr(-6)})`);
  }
  
  /**
   * Check if there's an active profile session for this browser session
   */
  static hasActiveKid(): boolean {
    return this.getActiveKidId() !== null;
  }
}