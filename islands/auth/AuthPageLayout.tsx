// cache-bust-20251012150230 - Force staging OAuth refresh
/**
 * Authentication Page Layout - Shared Layout Component
 *
 * Provides consistent layout structure for authentication pages with
 * branding, trust indicators, and responsive design. Eliminates 95%
 * duplication of layout structure between login.tsx and signup.tsx.
 */

import { ComponentChildren } from "preact";

export interface AuthPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ComponentChildren;
  showTrustIndicators?: boolean;
  className?: string;
  variant?: "login" | "signup";
}

export default function AuthPageLayout({
  title,
  subtitle,
  children,
  showTrustIndicators = true,
  className = "",
  variant = "login",
}: AuthPageLayoutProps) {
  return (
    <div
      className={`auth-page-layout ${className}`}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f9fafb, #f3f4f6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: "28rem", width: "100%" }}>
        {/* Main Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1.5rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden",
          }}
        >
          {/* Header Section */}
          <div
            style={{
              padding: "3rem 2rem 2rem",
              textAlign: "center" as const,
            }}
          >
            {/* Logo/Brand */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(to bottom right, #3b82f6, #9333ea)",
                  borderRadius: "1rem",
                  padding: "1.25rem",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <span style={{ fontSize: "2.5rem" }}>🏠</span>
              </div>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "0.75rem",
                lineHeight: "1.2",
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                style={{
                  fontSize: "1.125rem",
                  color: "#4b5563",
                  marginBottom: "2rem",
                  lineHeight: "1.5",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Section */}
          <div style={{ padding: "0 2rem 2rem" }}>
            {children}

            {/* Cross-Link */}
            <div style={{ textAlign: "center" as const, marginTop: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "#e5e7eb",
                  }}
                />
                <span
                  style={{
                    padding: "0 1rem",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "#e5e7eb",
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: "1rem",
                  color: "#4b5563",
                  margin: 0,
                  marginBottom: "1rem",
                }}
              >
                {variant === "login"
                  ? (
                    <>
                      Don't have an account?{" "}
                      <a
                        href="/register"
                        style={{
                          color: "#2563eb",
                          fontWeight: "600",
                          textDecoration: "underline",
                        }}
                        onMouseOver={(e) =>
                          e.currentTarget.style.color = "#1d4ed8"}
                        onMouseOut={(e) =>
                          e.currentTarget.style.color = "#2563eb"}
                      >
                        Sign up
                      </a>
                    </>
                  )
                  : (
                    <>
                      Already have an account?{" "}
                      <a
                        href="/login"
                        style={{
                          color: "#2563eb",
                          fontWeight: "600",
                          textDecoration: "underline",
                        }}
                        onMouseOver={(e) =>
                          e.currentTarget.style.color = "#1d4ed8"}
                        onMouseOut={(e) =>
                          e.currentTarget.style.color = "#2563eb"}
                      >
                        Sign in
                      </a>
                    </>
                  )}
              </p>

              {/* Legal Links - A2P SMS Compliance */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  lineHeight: "1.4",
                  marginTop: "1rem",
                }}
              >
                <p style={{ margin: 0, marginBottom: "0.5rem" }}>
                  By{" "}
                  {variant === "login" ? "signing in" : "creating an account"},
                  you agree to our{" "}
                  <a
                    href="/terms"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>.
                </p>
                <p style={{ margin: 0 }}>
                  See our{" "}
                  <a
                    href="/cookies"
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cookie Policy
                  </a>{" "}
                  for information about how we use cookies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        {showTrustIndicators && (
          <div style={{ marginTop: "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "2rem",
                fontSize: "0.875rem",
                color: "#4b5563",
                flexWrap: "wrap" as const,
              }}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "0.5rem", fontSize: "1rem" }}>
                  🔒
                </span>
                Secure {variant === "login" ? "Login" : "Signup"}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "0.5rem", fontSize: "1rem" }}>
                  ⚡
                </span>
                Quick Access
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "0.5rem", fontSize: "1rem" }}>
                  🏠
                </span>
                Your Family Awaits
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
