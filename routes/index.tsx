/**
 * Kid Selector Page (Post-Login)
 * Main entry point after parent authentication
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { ChoreService } from "../lib/services/chore-service.ts";
import KidSelector from "../islands/KidSelector.tsx";

interface IndexPageData {
  family: any;
  familyMembers: any[];
  error?: string;
}

export const handler: Handlers<IndexPageData> = {
  async GET(req, ctx) {
    // TODO: Get user session from authentication
    // For now, use a demo family
    const demoFamilyId = "445717ba-0841-4b68-994f-eef77bcf4f87"; // From the example data

    try {
      const choreService = new ChoreService();

      const family = await choreService.getFamily(demoFamilyId);
      if (!family) {
        return ctx.render({
          family: null,
          familyMembers: [],
          error: "Family not found. Please log in again.",
        });
      }

      const familyMembers = await choreService.getFamilyMembers(demoFamilyId);

      return ctx.render({
        family,
        familyMembers,
      });
    } catch (error) {
      console.error("Error loading family data:", error);
      return ctx.render({
        family: null,
        familyMembers: [],
        error: "Failed to load family data",
      });
    }
  },
};

export default function IndexPage({ data }: PageProps<IndexPageData>) {
  const { family, familyMembers, error } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <h1>ChoreGami 2026</h1>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a
            href="/login"
            class="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      <div class="header">
        <div>
          <a href="/login" style={{ color: "white", textDecoration: "none" }}>
            ← Logout
          </a>
        </div>
        <h1>ChoreGami 2026</h1>
        <div>
          <a
            href="/parent/dashboard"
            style={{ color: "white", textDecoration: "none" }}
          >
            ⚙️
          </a>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          Who's doing chores?
        </h2>
      </div>

      <KidSelector
        family={family}
        familyMembers={familyMembers}
      />

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a
          href="/parent/dashboard"
          style={{
            color: "var(--color-secondary)",
            textDecoration: "none",
            fontWeight: "500",
          }}
        >
          Parent View →
        </a>
      </div>
    </div>
  );
}
