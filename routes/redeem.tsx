/**
 * Gift Code Redemption Page
 * /redeem or /redeem?code=GIFT-XXXX-XXXX-XXXX
 * ~60 lines - Code-first flow: validate before requiring login
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../lib/auth/session.ts";
import RedeemForm from "../islands/RedeemForm.tsx";
import AppFooter from "../components/AppFooter.tsx";

interface RedeemPageData {
  prefillCode?: string;
  isLoggedIn: boolean;
}

export const handler: Handlers<RedeemPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);
    const url = new URL(req.url);
    const prefillCode = url.searchParams.get("code") || undefined;

    // Allow access without login - code-first validation
    return ctx.render({
      prefillCode,
      isLoggedIn: session.isAuthenticated,
    });
  },
};

export default function RedeemPage({ data }: PageProps<RedeemPageData>) {
  return (
    <div class="redeem-container">
      <div class="redeem-card">
        <RedeemForm prefillCode={data.prefillCode} isLoggedIn={data.isLoggedIn} />
        <AppFooter />
      </div>

      <style>{`
        .redeem-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg, #f0fdf4) 0%, #e8f5e8 100%);
          padding: 1rem;
        }
        .redeem-card {
          background: var(--color-card, white);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}
