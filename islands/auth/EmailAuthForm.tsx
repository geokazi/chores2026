/**
 * Email Authentication Form - Reusable Email/Password Form Component
 *
 * Provides consistent email and password form with variant-specific validation
 * and behavior. Eliminates 95% duplication of form logic between
 * login.tsx and signup.tsx.
 */

import { useEffect, useState } from "preact/hooks";

export interface EmailAuthFormProps {
  variant: "login" | "signup";
  error?: string;
  loading?: boolean;
  email?: string;
  className?: string;
  disabled?: boolean;
}

export default function EmailAuthForm({
  variant,
  error,
  loading = false,
  email = "",
  className = "",
  disabled = false,
}: EmailAuthFormProps) {
  const [formData, setFormData] = useState({
    email: email,
    password: "",
    confirmPassword: "",
  });
  const [validation, setValidation] = useState({
    email: true,
    password: true,
    confirmPassword: true,
  });
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, email }));
  }, [email]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (
    password: string,
  ): { valid: boolean; message?: string } => {
    if (variant === "login") {
      return { valid: password.length > 0 };
    }

    // Signup validation
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters",
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }
    if (!/\d/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }

    return { valid: true };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    if (field === "email") {
      setValidation((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (field === "password") {
      const passwordValidation = validatePassword(value);
      setValidation((prev) => ({
        ...prev,
        password: passwordValidation.valid,
      }));
    } else if (field === "confirmPassword" && variant === "signup") {
      setValidation((prev) => ({
        ...prev,
        confirmPassword: value === formData.password,
      }));
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (loading || disabled) return;

    // Validate all fields
    const emailValid = validateEmail(formData.email);
    const passwordValidation = validatePassword(formData.password);
    const confirmPasswordValid = variant === "signup"
      ? formData.password === formData.confirmPassword
      : true;

    setValidation({
      email: emailValid,
      password: passwordValidation.valid,
      confirmPassword: confirmPasswordValid,
    });

    if (emailValid && passwordValidation.valid && confirmPasswordValid) {
      // Direct form submission to the appropriate endpoint
      const form = document.createElement("form");
      form.method = "POST";
      form.action = variant === "login" ? "/login" : "/signup";

      // Preserve current URL parameters (like mode, plan, etc.)
      const currentParams = new URLSearchParams(globalThis.location.search);
      currentParams.set("mode", "email");
      form.action += `?${currentParams.toString()}`;

      // Add form data as hidden inputs
      const emailInput = document.createElement("input");
      emailInput.type = "hidden";
      emailInput.name = "email";
      emailInput.value = formData.email;
      form.appendChild(emailInput);

      const passwordInput = document.createElement("input");
      passwordInput.type = "hidden";
      passwordInput.name = "password";
      passwordInput.value = formData.password;
      form.appendChild(passwordInput);

      if (variant === "signup" && formData.confirmPassword) {
        const confirmPasswordInput = document.createElement("input");
        confirmPasswordInput.type = "hidden";
        confirmPasswordInput.name = "confirmPassword";
        confirmPasswordInput.value = formData.confirmPassword;
        form.appendChild(confirmPasswordInput);
      }

      const modeInput = document.createElement("input");
      modeInput.type = "hidden";
      modeInput.name = "mode";
      modeInput.value = "email";
      form.appendChild(modeInput);

      // Honeypot field - always empty for real users
      const honeypotInput = document.createElement("input");
      honeypotInput.type = "hidden";
      honeypotInput.name = "website";
      honeypotInput.value = "";
      form.appendChild(honeypotInput);

      document.body.appendChild(form);
      form.submit();
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.75rem",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
  };

  const errorInputStyle = {
    ...inputStyle,
    borderColor: "#ef4444",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "500" as const,
    color: "#374151",
    marginBottom: "0.5rem",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`email-auth-form ${className}`}
      style={{ marginBottom: "1.5rem" }}
    >
      {/* Email Field */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>
          Email address
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.currentTarget.value)}
          required
          disabled={disabled || loading}
          style={validation.email ? inputStyle : errorInputStyle}
          onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = validation.email
              ? "#d1d5db"
              : "#ef4444";
          }}
          placeholder="Enter your email"
        />
        {!validation.email && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "0.75rem",
              marginTop: "0.25rem",
            }}
          >
            Please enter a valid email address
          </p>
        )}
      </div>

      {/* Password Field */}
      <div style={{ marginBottom: variant === "signup" ? "1rem" : "1.5rem" }}>
        <label style={labelStyle}>
          Password
          {variant === "signup" && (
            <button
              type="button"
              onClick={() => setShowPasswordHelp(!showPasswordHelp)}
              style={{
                marginLeft: "0.5rem",
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              ⓘ
            </button>
          )}
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.currentTarget.value)}
          required
          disabled={disabled || loading}
          style={validation.password ? inputStyle : errorInputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#3b82f6";
            if (variant === "signup") setShowPasswordHelp(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = validation.password
              ? "#d1d5db"
              : "#ef4444";
          }}
          placeholder={variant === "login"
            ? "Enter your password"
            : "Create a password"}
        />
        {variant === "signup" && showPasswordHelp && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "#f9fafb",
              borderRadius: "0.375rem",
            }}
          >
            Password must contain:
            <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>
        )}
        {!validation.password && variant === "signup" && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "0.75rem",
              marginTop: "0.25rem",
            }}
          >
            {validatePassword(formData.password).message}
          </p>
        )}
      </div>

      {/* Confirm Password Field (Signup only) */}
      {variant === "signup" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>
            Confirm password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) =>
              handleInputChange("confirmPassword", e.currentTarget.value)}
            required
            disabled={disabled || loading}
            style={validation.confirmPassword ? inputStyle : errorInputStyle}
            onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = validation.confirmPassword
                ? "#d1d5db"
                : "#ef4444";
            }}
            placeholder="Confirm your password"
          />
          {!validation.confirmPassword && formData.confirmPassword && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              Passwords do not match
            </p>
          )}
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
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "none",
          fontSize: "1rem",
          fontWeight: "600" as const,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          transition: "background-color 0.2s",
        }}
        onMouseOver={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = "#2563eb";
          }
        }}
        onMouseOut={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = "#3b82f6";
          }
        }}
      >
        {loading
          ? (variant === "login" ? "Signing In..." : "Creating Account...")
          : (variant === "login" ? "Sign In" : "Create Account")}
      </button>
    </form>
  );
}
