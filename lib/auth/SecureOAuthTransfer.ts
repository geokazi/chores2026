/**
 * Secure OAuth Data Transfer Manager
 * Handles OAuth user data without URL exposure
 */

import { SecurityMonitor } from "./SecurityMonitor.ts";

export interface OAuthTransferData {
  userData: any;
  expires: number;
  transferId: string;
  timestamp: number;
}

export class SecureOAuthTransfer {
  private static readonly TRANSFER_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private static readonly STORAGE_PREFIX = "oauth_transfer_";

  /**
   * Store OAuth data securely in session storage
   */
  static storeOAuthData(userData: any): string {
    const transferId = crypto.randomUUID();

    // Security check: Log if data would have been exposed in URL
    const sensitiveFields = this.detectSensitiveFields(userData);
    if (sensitiveFields.length > 0) {
      SecurityMonitor.logOAuthDataLeakage(
        userData.app_metadata?.provider || "unknown",
        sensitiveFields,
        {
          transferId,
          dataSize: JSON.stringify(userData).length,
          preventedExposure: true,
        },
      );
    }

    const transferData: OAuthTransferData = {
      userData,
      expires: Date.now() + this.TRANSFER_EXPIRY,
      transferId,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(
        `${this.STORAGE_PREFIX}${transferId}`,
        JSON.stringify(transferData),
      );

      // Schedule automatic cleanup
      setTimeout(() => this.cleanupTransfer(transferId), this.TRANSFER_EXPIRY);

      return transferId;
    } catch (error) {
      console.error("Failed to store OAuth transfer data:", error);
      throw new Error("OAuth transfer storage failed");
    }
  }

  /**
   * Retrieve and consume OAuth data
   */
  static retrieveOAuthData(transferId: string): any | null {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${transferId}`;
      const storedData = sessionStorage.getItem(storageKey);

      if (!storedData) {
        console.warn("OAuth transfer data not found:", transferId);
        return null;
      }

      const transferData: OAuthTransferData = JSON.parse(storedData);

      // Check expiration
      if (Date.now() > transferData.expires) {
        console.warn("OAuth transfer data expired:", transferId);
        this.cleanupTransfer(transferId);
        return null;
      }

      // Consume the data (remove after retrieval)
      this.cleanupTransfer(transferId);

      return transferData.userData;
    } catch (error) {
      console.error("Failed to retrieve OAuth transfer data:", error);
      return null;
    }
  }

  /**
   * Clean up expired or consumed transfer data
   */
  static cleanupTransfer(transferId: string): void {
    try {
      sessionStorage.removeItem(`${this.STORAGE_PREFIX}${transferId}`);
    } catch (error) {
      console.error("Failed to cleanup OAuth transfer:", error);
    }
  }

  /**
   * Clean up all expired transfers
   */
  static cleanupExpiredTransfers(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const data = sessionStorage.getItem(key);
          if (data) {
            try {
              const transferData: OAuthTransferData = JSON.parse(data);
              if (Date.now() > transferData.expires) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key); // Remove malformed data
            }
          }
        }
      }

      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to cleanup expired OAuth transfers:", error);
    }
  }

  /**
   * Detect sensitive fields that would be dangerous in URL parameters
   */
  private static detectSensitiveFields(userData: any): string[] {
    const sensitiveFields: string[] = [];

    if (!userData || typeof userData !== "object") {
      return sensitiveFields;
    }

    // Check for common sensitive fields
    const dangerousFields = [
      "email",
      "phone",
      "access_token",
      "refresh_token",
      "id_token",
      "sub",
      "aud",
      "iss",
      "avatar_url",
      "full_name",
      "name",
      "user_metadata",
      "app_metadata",
      "provider_token",
      "provider_refresh_token",
    ];

    for (const field of dangerousFields) {
      if (userData[field] !== undefined && userData[field] !== null) {
        sensitiveFields.push(field);
      }
    }

    // Check nested objects
    if (userData.user_metadata) {
      sensitiveFields.push("user_metadata");
    }
    if (userData.app_metadata) {
      sensitiveFields.push("app_metadata");
    }

    return sensitiveFields;
  }
}
