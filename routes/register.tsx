/**
 * Register Route - New User Signup with Email, Phone OTP, or Social Auth
 * Creates Supabase auth user, then redirects to /setup for profile completion
 * ~115 lines - reuses existing auth islands, respects 500 line limit
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import { isPhoneSignup, resolvePhone } from "../lib/utils/resolve-phone.ts";
import AuthModeSelector from "../islands/auth/AuthModeSelector.tsx";
import PhoneAuthForm from "../islands/auth/PhoneAuthForm.tsx";
import SocialAuthButtons from "../islands/auth/SocialAuthButtons.tsx";
import AppFooter from "../components/AppFooter.tsx";
import { sendWelcomeEmail } from "../lib/services/email-service.ts";

type AuthMode = "email" | "phone" | "social";

interface RegisterPageData {
  mode: AuthMode;
  error?: string;
  otpSent?: boolean;
  refCode?: string;  // Referral code from /r/[code] redirect
}

export const handler: Handlers<RegisterPageData> = {
  async POST(req, ctx) {
    const formData = await req.formData();
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;
    const refCode = url.searchParams.get("ref") || formData.get("ref") as string || undefined;

    // Build setup URL with ref param if present
    const setupUrl = refCode ? `/setup?ref=${encodeURIComponent(refCode)}` : "/setup";

    // Honeypot check - bots fill hidden fields, humans don't
    const honeypot = formData.get("website");
    if (honeypot) {
      console.warn("🤖 Honeypot triggered on register:", {
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        timestamp: new Date().toISOString()
      });
      // Return generic error to not tip off bots
      return ctx.render({ mode, error: "Registration failed. Please try again." });
    }

    // Phone OTP verification (same as login - creates user if needed)
    if (formData.has("otp")) {
      const phone = formData.get("phone") as string;
      const otp = formData.get("otp") as string;

      try {
        const { TwilioVerifyClient } = await import("../lib/twilio-client.ts");
        const twilioClient = new TwilioVerifyClient();
        const result = await twilioClient.verifyCode(phone, otp);

        if (!result.success || !result.valid) {
          return ctx.render({ mode: "phone", error: result.error || "Invalid code", otpSent: true });
        }

        // Phone verified - create or get user
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Check if user exists with this phone
        const { data: users } = await supabase.auth.admin.listUsers();
        const phoneDigits = phone.replace(/\D/g, "");
        const existingUser = users?.users?.find(u =>
          u.phone === phone ||
          u.email?.includes(`+1${phoneDigits}@phone.`) ||
          u.email?.includes(`${phoneDigits}@phone.`)
        );

        let targetUser = existingUser;

        if (!targetUser) {
          // New user - create with phone-based email
          const phoneEmail = `${phone}@phone.choregami.local`;
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: phoneEmail,
            phone: phone,
            email_confirm: true,
            phone_confirm: true,
          });

          if (createError || !newUser.user) {
            return ctx.render({ mode: "phone", error: "Failed to create account", otpSent: true });
          }
          targetUser = newUser.user;
        }

        // Generate magic link to get session tokens (don't redirect through Supabase)
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: targetUser.email!,
        });

        if (linkData?.properties?.action_link) {
          // Extract tokens from the action_link and set cookies directly
          // action_link format: https://PROJECT.supabase.co/auth/v1/verify?token=XXX&type=magiclink&redirect_to=...
          // We need to verify the token to get a session
          const actionUrl = new URL(linkData.properties.action_link);
          const token = actionUrl.searchParams.get("token");
          const type = actionUrl.searchParams.get("type");

          if (token && type) {
            // Verify the token to get actual session
            const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: type as "magiclink",
            });

            if (!verifyError && sessionData.session) {
              return createSessionResponse(req, sessionData.session, setupUrl, phone);
            }
          }
        }

        return ctx.render({ mode: "phone", error: "Account created but login failed", otpSent: true });
      } catch (error) {
        console.error("Phone register error:", error);
        return ctx.render({ mode: "phone", error: "Registration failed", otpSent: true });
      }
    }

    // Phone OTP send mode
    if (mode === "phone") {
      const phone = formData.get("phone") as string;
      if (!phone) {
        return ctx.render({ mode, error: "Phone number required" });
      }

      try {
        const { TwilioVerifyClient } = await import("../lib/twilio-client.ts");
        const twilioClient = new TwilioVerifyClient();
        const result = await twilioClient.sendVerification(phone);

        if (!result.success) {
          return ctx.render({ mode, error: result.error || "Failed to send code" });
        }

        return ctx.render({ mode, otpSent: true });
      } catch (error) {
        console.error("SMS error:", error);
        return ctx.render({ mode, error: "Failed to send code" });
      }
    }

    // Email/password signup
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password) {
      return ctx.render({ mode: "email", error: "Email and password required" });
    }

    if (password !== confirmPassword) {
      return ctx.render({ mode: "email", error: "Passwords do not match" });
    }

    if (password.length < 8) {
      return ctx.render({ mode: "email", error: "Password must be at least 8 characters" });
    }

    try {
      // Use admin API to create user with confirmed email, then send welcome via Resend
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === email);
      if (userExists) {
        return ctx.render({ mode: "email", error: "Unable to create account. Please try signing in or use a different email." });
      }

      // Create user with email pre-confirmed (we'll verify via Resend)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error("User creation error:", createError);
        return ctx.render({ mode: "email", error: createError?.message || "Failed to create account" });
      }

      console.log("✅ User created:", newUser.user.email);

      // Send welcome email via Resend
      const setupUrl = new URL("/setup", req.url).toString();
      console.log("📧 Attempting to send welcome email to:", email, "with setup URL:", setupUrl);

      try {
        const emailResult = await sendWelcomeEmail(email, setupUrl);
        if (emailResult.success) {
          console.log("✅ Welcome email sent successfully to:", email);
        } else {
          console.warn("⚠️ Welcome email failed (non-critical):", emailResult.error);
        }
      } catch (emailError) {
        console.error("❌ Welcome email exception:", emailError);
      }

      // Generate magic link to log them in immediately
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: { redirectTo: new URL(setupUrl, req.url).toString() },
      });

      if (linkError || !linkData?.properties?.action_link) {
        // Fallback: tell them to log in manually
        return ctx.render({ mode: "email", error: "Account created! Check your email, then sign in." });
      }

      // Auto-login via magic link
      return new Response(null, {
        status: 303,
        headers: { Location: linkData.properties.action_link },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return ctx.render({ mode: "email", error: "Registration failed" });
    }
  },

  async GET(req, ctx) {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "email") as AuthMode;
    const error = url.searchParams.get("error") || undefined;
    const refCode = url.searchParams.get("ref") || undefined;

    return ctx.render({ mode, error, refCode });
  },
};

function createSessionResponse(req: Request, session: any, redirectTo: string, verifiedPhone?: string) {
  const isLocalhost = req.url.includes("localhost");
  const isSecure = !isLocalhost;

  const cookies = [
    `sb-access-token=${session.access_token}; Path=/; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; ${isSecure ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  ];

  // Build userData for localStorage (MealPlanner pattern)
  const user = session.user || {};
  const userData = {
    id: user.id,
    email: user.email || null,
    phone: resolvePhone(user, verifiedPhone),
    user_metadata: user.user_metadata || {},
    signup_method: isPhoneSignup(user, verifiedPhone) ? "phone" : "email",
    auth_flow: "signup",
    stored_at: new Date().toISOString(),
  };

  // Return HTML page that writes localStorage then redirects
  return new Response(
    `<!DOCTYPE html><html><head><title>Setting up...</title></head>
    <body>
      <script>
        localStorage.setItem('chores2026_user_data', ${JSON.stringify(JSON.stringify(userData))});
        window.location.href = '${redirectTo}';
      </script>
    </body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Set-Cookie": cookies.join(", "),
      },
    },
  );
}

export default function RegisterPage({ data }: PageProps<RegisterPageData>) {
  const { mode, error, otpSent, refCode } = data;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_KEY") || "";

  return (
    <>
      <script src="/oauth-fragment-handler.js"></script>

      <div class="register-container">
        <div class="register-card">
          <div class="register-header">
            <div class="register-logo">
              <svg class="logo-icon" viewBox="0 0 1024 1024" width="36" height="36" fill="currentColor">
                <path d="M0 0 C6.87 2.31 13.68 4.79 20.5 7.25 C22.31 7.9 24.12 8.55 25.94 9.2 C35.36 12.58 44.77 16.01 54.16 19.49 C59.13 21.32 64.11 23.11 69.11 24.86 C79.36 28.46 89.56 32.19 99.76 35.91 C118.97 42.92 138.2 49.89 157.46 56.8 C160.79 57.99 164.13 59.19 167.46 60.39 C177.12 63.86 186.79 67.29 196.52 70.54 C198.86 71.33 201.19 72.12 203.53 72.9 C205.59 73.59 207.66 74.25 209.73 74.91 C218.24 77.78 223.83 81.5 230 88 C230.91 88.93 230.91 88.93 231.84 89.87 C233.49 91.57 235.09 93.31 236.69 95.06 C237.88 96.36 239.08 97.65 240.27 98.95 C240.88 99.61 241.49 100.27 242.12 100.95 C245.33 104.44 248.57 107.91 251.81 111.38 C252.44 112.05 253.07 112.72 253.71 113.41 C257.88 117.86 262.14 122.19 266.56 126.4 C268 128 268 128 268 130 C268.89 130.4 268.89 130.4 269.8 130.8 C272.1 132.05 273.48 133.31 275.24 135.23 C275.83 135.87 276.43 136.51 277.04 137.17 C277.64 137.83 278.25 138.5 278.88 139.19 C279.77 140.16 279.77 140.16 280.69 141.15 C283.57 144.27 286.39 147.43 289.13 150.68 C291.62 153.6 294.25 156.32 297 159 C302.59 164.51 308.1 170 313.19 175.97 C316.17 179.31 319.4 182.41 322.58 185.55 C324.71 187.7 326.72 189.9 328.69 192.19 C330.99 194.85 333.29 197.49 335.69 200.06 C336.23 200.65 336.77 201.24 337.32 201.85 C338.92 203.23 338.92 203.23 340.83 202.72 C343.23 201.92 345.19 200.88 347.36 199.59 C348.22 199.08 349.07 198.57 349.95 198.05 C350.88 197.5 351.8 196.95 352.75 196.38 C353.72 195.8 354.69 195.22 355.69 194.62 C372.2 184.73 388.43 174.39 404.62 164 C412.95 158.65 421.33 153.4 429.73 148.17 C435.05 144.85 440.36 141.52 445.63 138.13 C446.68 137.45 447.74 136.77 448.82 136.07 C451.14 134.56 453.43 133.03 455.71 131.46 C456.33 131.04 456.95 130.61 457.6 130.18 C458.78 129.38 459.96 128.57 461.12 127.74 C465.22 124.99 468.13 124.15 473 125 C475.64 126.65 477.75 128.68 479.94 130.88 C480.53 131.43 481.11 131.99 481.72 132.56 C483.2 133.99 484.61 135.49 486 137 C486 137.66 486 138.32 486 139 C486.66 139 487.32 139 488 139 C488 139.66 488 140.32 488 141 C488.53 141.2 489.06 141.4 489.61 141.61 C493.04 143.6 495.51 146.34 498.25 149.19 C501.7 152.75 505.17 156.19 508.92 159.43 C513.88 163.7 518.42 168.37 523 173.04 C526.92 177 530.94 180.74 535.16 184.38 C538.65 187.45 541.84 190.83 545.09 194.16 C547.23 196.3 549.46 198.3 551.75 200.27 C556.5 204.39 561.02 208.72 565.5 213.13 C566.32 213.91 567.14 214.7 567.99 215.5 C569.16 216.65 569.16 216.65 570.34 217.82 C571.05 218.5 571.75 219.19 572.47 219.89 C574.34 222.47 574.39 223.89 574 227 C573 228 573 228 570.65 228.09 C569.6 228.07 568.56 228.06 567.48 228.04 C566.29 228.02 565.1 228 563.88 227.99 C562.57 227.96 561.26 227.94 559.91 227.91 C558.53 227.89 557.15 227.87 555.77 227.85 C552.84 227.8 549.91 227.75 546.98 227.7 C543.36 227.64 539.74 227.58 536.13 227.52 C512.75 227.16 489.37 226.6 466 226 C465.94 227.23 465.88 228.46 465.82 229.73 C465.27 241.35 464.71 252.97 464.15 264.6 C463.86 270.57 463.57 276.55 463.29 282.52 C463.01 288.29 462.74 294.06 462.45 299.83 C462.34 302.03 462.24 304.23 462.14 306.42 C461.99 309.51 461.84 312.6 461.69 315.69 C461.65 316.58 461.61 317.48 461.57 318.41 C460.6 336.75 460.6 336.75 454.35 342.53 C449.64 346.61 444.88 350.62 440.06 354.56 C438.57 355.79 437.08 357.02 435.58 358.24 C434.05 359.49 432.53 360.75 431 362 C422.46 369.01 413.94 376.02 405.52 383.17 C400.4 387.52 395.21 391.77 390 396 C388.75 397.02 387.5 398.04 386.25 399.06 C379.74 404.38 373.2 409.65 366.56 414.81 C361.93 418.42 357.47 422.17 353.13 426.12 C350.09 428.8 346.91 431.29 343.73 433.8 C340.61 436.31 337.55 438.9 334.5 441.5 C330.01 445.33 325.46 449.06 320.83 452.73 C314.91 457.47 309.09 462.33 303.24 467.15 C299.66 470.11 296.08 473.05 292.5 476 C288.18 479.56 283.86 483.12 279.54 486.68 C260.62 502.27 260.62 502.27 252.23 509.05 C245.89 514.18 239.57 519.33 233.38 524.63 C228.44 528.84 223.39 532.88 218.26 536.85 C213.4 540.63 208.71 544.59 204.09 548.65 C200.21 552 200.21 552 198 552 C197.63 553.61 197.63 553.61 197.25 555.25 C193.69 569.47 193.69 569.47 190 575 C187.86 576.24 187.86 576.24 185.17 577.46 C184.16 577.93 183.15 578.39 182.1 578.87 C181 579.37 179.89 579.86 178.75 580.38 C177.6 580.9 176.46 581.42 175.28 581.96 C165.04 586.59 154.74 591.05 144.42 595.49 C137.16 598.61 129.97 601.83 122.84 605.21 C105.17 613.52 87.09 621.03 69.13 628.67 C66.29 629.88 63.46 631.09 60.63 632.31 C59.11 632.96 57.58 633.6 56.06 634.25 C55.4 634.54 54.74 634.83 54.06 635.12 C50.59 636.58 47.77 637.42 44 637 C43 636 43 636 43 634.21 C43.54 628.49 44.96 624.1 47.58 619.01 C48.12 617.91 48.12 617.91 48.68 616.79 C49.45 615.23 50.24 613.67 51.02 612.11 C52.7 608.8 54.34 605.48 55.99 602.15 C56.82 600.47 57.65 598.79 58.49 597.11 C61.94 590.16 65.26 583.17 68.5 576.13 C69.01 575.03 69.51 573.93 70.04 572.8 C71.39 569.86 72.74 566.91 74.1 563.97 C77.29 557.02 80.49 550.07 83.69 543.13 C84.26 541.89 84.26 541.89 84.83 540.64 C91.32 526.55 97.93 512.53 104.59 498.53 C109.07 489.1 113.5 479.66 117.88 470.19 C121.85 461.59 125.88 453.03 130 444.5 C137.68 428.57 145.08 412.5 152.49 396.43 C153.31 394.66 154.13 392.88 154.95 391.1 C156.97 386.72 158.98 382.35 161 377.97 C161.74 376.36 162.48 374.75 163.23 373.13 C163.56 372.4 163.9 371.67 164.25 370.91 C164.57 370.22 164.89 369.53 165.21 368.82 C165.51 368.17 165.81 367.51 166.11 366.84 C166.95 365.1 167.9 363.42 168.86 361.74 C170.28 359.13 170.28 359.13 169.37 356.85 C167.99 354.99 166.62 353.16 165.13 351.38 C164.56 350.7 163.99 350.02 163.41 349.32 C162.8 348.59 162.19 347.87 161.56 347.13 C157.05 341.7 152.58 336.26 148.25 330.69 C144.01 325.24 139.64 319.91 135.19 314.62 C134.47 313.76 133.75 312.89 133 312 C132.25 311.1 131.49 310.21 130.71 309.29 C129 307 129 307 129 305 C128.34 305 127.68 305 127 305 C125.59 303.42 125.59 303.42 123.94 301.19 C121.28 297.67 118.56 294.21 115.75 290.81 C112.13 286.4 108.55 281.97 105 277.5 C104.52 276.9 104.04 276.3 103.54 275.68 C101.53 273.13 100.04 271.11 99 268 C98.34 268 97.68 268 97 268 C95.73 266.59 95.73 266.59 94.19 264.5 C90.8 260.02 87.3 255.66 83.75 251.31 C79.57 246.19 75.44 241.03 71.38 235.81 C67.34 230.64 63.18 225.61 58.92 220.62 C54.84 215.83 50.9 210.94 47 206 C42.23 200.01 37.41 194.05 32.55 188.12 C27.85 182.38 23.18 176.62 18.51 170.86 C17.14 169.18 15.77 167.5 14.39 165.82 C13.3 164.49 13.3 164.49 12.19 163.13 C11.56 162.36 10.94 161.6 10.29 160.82 C9 159 9 159 9 157 C8.34 157 7.68 157 7 157 C5.34 155.06 3.79 153.1 2.25 151.06 C-2.13 145.37 -6.61 139.78 -11.19 134.25 C-15.47 129.08 -19.72 123.88 -23.9 118.63 C-26.64 115.2 -29.41 111.79 -32.19 108.38 C-32.74 107.7 -33.29 107.02 -33.86 106.32 C-36.74 102.78 -39.62 99.23 -42.52 95.7 C-43.09 94.99 -43.66 94.29 -44.25 93.56 C-45.34 92.24 -46.42 90.91 -47.51 89.58 C-49.02 87.73 -50.51 85.87 -52 84 C-52.57 83.29 -53.13 82.59 -53.71 81.86 C-54.54 80.8 -54.54 80.8 -55.38 79.71 C-55.89 79.07 -56.39 78.43 -56.91 77.77 C-58 76 -58 76 -57.94 73.06 C-57 71 -57 71 -56 70 C-48.13 69.97 -40.75 72.32 -33.31 74.63 C-32.13 74.98 -30.94 75.34 -29.72 75.71 C-26.15 76.8 -22.57 77.9 -19 79 C-15.21 80.17 -11.42 81.34 -7.63 82.5 C-6.27 82.92 -6.27 82.92 -4.88 83.34 C10.28 87.96 25.6 92.24 41 96 C40.69 95.49 40.39 94.99 40.07 94.47 C34.54 85.29 29.03 76.1 23.69 66.81 C19.46 59.47 15.13 52.19 10.75 44.94 C5.31 35.9 -0.04 26.82 -5.31 17.69 C-6.27 16.02 -6.27 16.02 -7.25 14.33 C-14.06 2.49 -14.06 2.49 -13.75 -0.19 C-11.53 -5.54 -4.02 -1.27 0 0 Z " transform="translate(253,195)"/>
              </svg>
              <h1>ChoreGami 2026</h1>
            </div>
            <p>Create your account</p>
          </div>

          {error && <div class="error-message">{error}</div>}

          <AuthModeSelector currentMode={mode} variant="signup" />

          {mode === "email" && (
            <form method="POST" class="register-form">
              {/* Preserve referral code through form submission */}
              {refCode && <input type="hidden" name="ref" value={refCode} />}
              {/* Honeypot field - invisible to humans, bots fill it */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required class="form-input" placeholder="parent@example.com" />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required class="form-input" placeholder="Min 8 characters" minLength={8} />
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required class="form-input" placeholder="Confirm password" />
              </div>
              <button type="submit" class="register-button">Create Account</button>
            </form>
          )}

          {mode === "phone" && (
            <PhoneAuthForm variant="signup" otpSent={otpSent} error={error} />
          )}

          {mode === "social" && (
            <>
              <script dangerouslySetInnerHTML={{ __html: `window.SUPABASE_URL="${supabaseUrl}";window.SUPABASE_KEY="${supabaseKey}";` }} />
              <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
              <SocialAuthButtons />
            </>
          )}

          <div class="register-footer">
            <p>Already have an account? <a href="/login">Sign In</a></p>
            <p class="legal-note">
              By creating an account, you agree to our{" "}
              <a href="/terms" class="legal-link">Terms</a> and{" "}
              <a href="/privacy" class="legal-link">Privacy Policy</a>
            </p>
          </div>
          <AppFooter />
        </div>

        <style>{`
          .register-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
            padding: 1rem;
          }
          .register-card {
            background: var(--color-card, white);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
          }
          .register-header {
            text-align: center;
            margin-bottom: 1.5rem;
          }
          .register-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }
          .register-logo .logo-icon {
            color: #3b5998;
          }
          .register-header h1 {
            margin: 0 0 0.5rem 0;
            color: #3b5998;
            font-size: 2rem;
            font-weight: 700;
          }
          .register-logo h1 {
            margin: 0;
          }
          .register-header p {
            margin: 0;
            color: var(--color-text, #064e3b);
            opacity: 0.8;
          }
          .error-message {
            background: #fee;
            color: var(--color-warning, #ef4444);
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid var(--color-warning, #ef4444);
          }
          .register-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .form-group label {
            font-weight: 600;
            color: var(--color-text, #064e3b);
          }
          .form-input {
            padding: 0.75rem;
            border: 2px solid #e5e5e5;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease;
          }
          .form-input:focus {
            outline: none;
            border-color: var(--color-primary, #10b981);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          }
          .register-button {
            background: var(--color-primary, #10b981);
            color: white;
            border: none;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.5rem;
          }
          .register-button:hover {
            background: #059669;
            transform: translateY(-1px);
          }
          .register-footer {
            text-align: center;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e5e5;
          }
          .register-footer a {
            color: var(--color-primary, #10b981);
            text-decoration: none;
            font-weight: 600;
          }
          .register-footer a:hover {
            text-decoration: underline;
          }
          .legal-note {
            color: #666;
            font-size: 0.75rem;
            margin: 0.5rem 0 0 0;
          }
          .legal-link {
            color: var(--color-primary, #10b981);
            text-decoration: none;
          }
          .legal-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    </>
  );
}
