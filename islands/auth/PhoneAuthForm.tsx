/**
 * Phone Authentication Form - User-Friendly North American
 * Clear, simple phone entry with proper formatting
 */

import { useEffect, useState } from "preact/hooks";

export interface PhoneAuthFormProps {
  variant: "login" | "signup";
  otpSent?: boolean;
  error?: string;
  loading?: boolean;
  phone?: string;
  disabled?: boolean;
}

export default function PhoneAuthForm({
  variant,
  otpSent = false,
  error,
  loading = false,
  phone = "",
  disabled = false,
}: PhoneAuthFormProps) {
  // Secure phone number storage - avoid URL parameters
  const getSecurePhoneNumber = (): string => {
    // Priority: sessionStorage > props > empty
    try {
      if (typeof sessionStorage !== "undefined") {
        const stored = sessionStorage.getItem(
          `chores2026_auth_phone_${variant}`,
        );
        if (stored) return stored;
      }
    } catch (_e) {
      console.warn("SessionStorage not available, using fallback");
    }
    return phone;
  };

  const setSecurePhoneNumber = (phoneNum: string): void => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(`chores2026_auth_phone_${variant}`, phoneNum);
      }
    } catch (_e) {
      console.warn("SessionStorage not available");
    }
  };

  const clearSecurePhoneNumber = (): void => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(`chores2026_auth_phone_${variant}`);
      }
    } catch (_e) {
      console.warn("SessionStorage not available");
    }
  };

  const [phoneValue, setPhoneValue] = useState(getSecurePhoneNumber());
  const [otpValue, setOtpValue] = useState("");

  // Store phone number securely when it changes
  useEffect(() => {
    if (phoneValue) {
      setSecurePhoneNumber(phoneValue);
    }
  }, [phoneValue, variant]);

  // Format phone as user types: (555) 123-4567
  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    }
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${
      numbers.slice(6, 10)
    }`;
  };

  // Convert display format to +1XXXXXXXXXX
  const normalizePhone = (formatted: string) => {
    const numbers = formatted.replace(/\D/g, "");
    return numbers.length === 10 ? `+1${numbers}` : formatted;
  };

  // Format phone for display: (XXX) XXX-1234
  const maskPhoneForDisplay = (phone: string) => {
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length >= 10) {
      const last4 = numbers.slice(-4);
      return `(XXX) XXX-${last4}`;
    }
    return phone;
  };

  const handlePhoneChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const formatted = formatPhoneInput(input.value);
    setPhoneValue(formatted);
    input.value = formatted;
  };

  // Simple OTP handler - accepts typing or paste, strips non-digits
  const handleOtpChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "").slice(0, 6);
    setOtpValue(digits);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    // Create hidden form and submit
    const submitForm = document.createElement("form");
    submitForm.method = "POST";
    submitForm.action = variant === "login" ? "/login" : "/signup";

    const params = new URLSearchParams(globalThis.location.search);
    params.set("mode", "phone");
    submitForm.action += `?${params.toString()}`;

    // Add phone (normalized)
    const phoneInput = document.createElement("input");
    phoneInput.type = "hidden";
    phoneInput.name = "phone";
    phoneInput.value = normalizePhone(phoneValue);
    submitForm.appendChild(phoneInput);

    // Add OTP if in verification step
    if (otpSent) {
      const otpInput = document.createElement("input");
      otpInput.type = "hidden";
      otpInput.name = "otp";
      otpInput.value = otpValue;
      submitForm.appendChild(otpInput);
    }

    // Add mode
    const modeInput = document.createElement("input");
    modeInput.type = "hidden";
    modeInput.name = "mode";
    modeInput.value = "phone";
    submitForm.appendChild(modeInput);

    document.body.appendChild(submitForm);
    submitForm.submit();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
      {/* Phone Number */}
      {!otpSent && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "16px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Enter your phone number
          </label>
          <input
            type="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            required
            disabled={disabled || loading}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            style={{
              width: "100%",
              padding: "16px",
              border: "2px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "20px",
              outline: "none",
              WebkitAppearance: "none",
              boxSizing: "border-box",
              minHeight: "56px",
              fontFamily: "monospace",
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          />
        </div>
      )}

      {/* OTP Verification - Simple single input */}
      {otpSent && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "16px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Enter 6-digit code
          </label>
          <input
            type="text"
            value={otpValue}
            onInput={handleOtpChange}
            maxLength={6}
            disabled={disabled || loading}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            style={{
              width: "100%",
              padding: "16px",
              border: "2px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "28px",
              outline: "none",
              boxSizing: "border-box",
              minHeight: "56px",
              fontFamily: "monospace",
              textAlign: "center",
              letterSpacing: "0.5em",
            }}
          />
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px 0" }}>
              Code sent to {maskPhoneForDisplay(phoneValue)}
            </p>
            <button
              type="button"
              onClick={() => {
                clearSecurePhoneNumber();
                globalThis.location.href = `${variant === "login" ? "/login" : "/signup"}?mode=phone`;
              }}
              style={{
                background: "none",
                border: "none",
                color: "#3b82f6",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
                padding: "4px",
              }}
            >
              Edit number
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || loading}
        style={{
          width: "100%",
          backgroundColor: disabled || loading ? "#9ca3af" : "#3b82f6",
          color: "white",
          padding: "16px 24px",
          borderRadius: "12px",
          border: "none",
          fontSize: "18px",
          fontWeight: "600",
          cursor: disabled || loading ? "not-allowed" : "pointer",
          minHeight: "56px",
          WebkitAppearance: "none",
          boxSizing: "border-box",
          touchAction: "manipulation",
          marginBottom: otpSent ? "12px" : "0",
        }}
      >
        {loading
          ? (otpSent ? "Verifying..." : "Sending Code...")
          : (otpSent ? "Verify Code" : "Send Code")}
      </button>

      {/* Resend option */}
      {otpSent && !loading && (
        <button
          type="button"
          onClick={() => {
            // Store phone securely before resend
            setSecurePhoneNumber(normalizePhone(phoneValue));
            globalThis.location.href = `${
              variant === "login" ? "/login" : "/signup"
            }?mode=phone&resend=true`;
          }}
          style={{
            width: "100%",
            backgroundColor: "transparent",
            border: "2px solid #3b82f6",
            color: "#3b82f6",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
            minHeight: "56px",
            WebkitAppearance: "none",
            boxSizing: "border-box",
            touchAction: "manipulation",
          }}
        >
          Resend Code
        </button>
      )}
    </form>
  );
}
