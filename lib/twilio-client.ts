/**
 * Twilio Verify Client
 *
 * Provides a clean interface for Twilio Verify API operations
 * Replaces direct messaging approach with verification-specific endpoints
 */

interface TwilioVerifyResponse {
  sid: string;
  status: string;
  valid: boolean;
  to: string;
  channel: string;
  lookup?: {
    carrier?: {
      name?: string;
      type?: string;
    };
  };
}

interface VerifyError {
  code: number;
  message: string;
  status: number;
}

export class TwilioVerifyClient {
  private accountSid: string;
  private authToken: string;
  private serviceSid: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    this.authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    this.serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;
    this.baseUrl = `https://verify.twilio.com/v2/Services/${this.serviceSid}`;

    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      throw new Error(
        "Missing Twilio Verify configuration. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID environment variables.",
      );
    }
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.accountSid}:${this.authToken}`);
    return `Basic ${credentials}`;
  }

  /**
   * Send verification code via SMS
   */
  async sendVerification(
    phoneNumber: string,
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          "Authorization": this.getAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          Channel: "sms",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Twilio Verify send error:", data);
        return {
          success: false,
          error: this.mapTwilioError(data),
        };
      }

      console.log("Verification sent successfully:", {
        sid: data.sid,
        to: data.to,
        status: data.status,
      });

      return {
        success: true,
        sid: data.sid,
      };
    } catch (error) {
      console.error("Network error sending verification:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(
    phoneNumber: string,
    code: string,
  ): Promise<
    { success: boolean; valid?: boolean; error?: string; status?: string }
  > {
    try {
      const response = await fetch(`${this.baseUrl}/VerificationCheck`, {
        method: "POST",
        headers: {
          "Authorization": this.getAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          Code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Twilio Verify check error:", data);
        return {
          success: false,
          error: this.mapTwilioError(data),
        };
      }

      console.log("Verification check result:", {
        valid: data.valid,
        status: data.status,
        to: data.to,
      });

      return {
        success: true,
        valid: data.valid,
        status: data.status,
      };
    } catch (error) {
      console.error("Network error verifying code:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }

  /**
   * Map Twilio error codes to user-friendly messages
   */
  private mapTwilioError(error: any): string {
    const errorCode = error.code;

    switch (errorCode) {
      case 60200:
        return "Invalid phone number format. Please check and try again.";
      case 60201:
        return "Phone number is not valid. Please check and try again.";
      case 60202:
        return "Maximum verification attempts exceeded. Please try again later.";
      case 60203:
        return "Maximum verification checks exceeded. Please request a new code.";
      case 60204:
        return "Invalid verification code. Please check and try again.";
      case 60205:
        return "Verification code expired. Please request a new code.";
      case 60212:
        return "Rate limit exceeded. Please wait before requesting another code.";
      case 60220:
        return "Phone number cannot receive SMS messages.";
      case 60223:
        return "Phone number is blocked or invalid.";
      default:
        return error.message || "Verification failed. Please try again.";
    }
  }
}

// Singleton instance
let twilioVerifyClient: TwilioVerifyClient | null = null;

export function getTwilioVerifyClient(): TwilioVerifyClient {
  if (!twilioVerifyClient) {
    twilioVerifyClient = new TwilioVerifyClient();
  }
  return twilioVerifyClient;
}
