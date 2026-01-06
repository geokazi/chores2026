/**
 * Chore Detail Page
 * Shows chore instructions and completion interface
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { ChoreService } from "../../../../lib/services/chore-service.ts";
import { TransactionService } from "../../../../lib/services/transaction-service.ts";
import ChoreDetail from "../../../../islands/ChoreDetail.tsx";

interface ChoreDetailData {
  kid: any;
  family: any;
  chore: any;
  error?: string;
  success?: boolean;
}

export const handler: Handlers<ChoreDetailData> = {
  async GET(req, ctx) {
    const kidId = ctx.params.kid_id;
    const choreId = ctx.params.chore_id;

    try {
      const choreService = new ChoreService();

      // Get the kid's profile
      const kid = await choreService.getFamilyMember(kidId);
      if (!kid) {
        return ctx.render({
          kid: null,
          family: null,
          chore: null,
          error: "Kid not found",
        });
      }

      // Get family info
      const family = await choreService.getFamily(kid.family_id);

      // Get chore assignment
      const chore = await choreService.getChoreAssignment(
        choreId,
        kid.family_id,
      );
      if (!chore) {
        return ctx.render({
          kid,
          family,
          chore: null,
          error: "Chore not found",
        });
      }

      // Verify chore is assigned to this kid
      if (chore.assigned_to_profile_id !== kidId) {
        return ctx.render({
          kid,
          family,
          chore: null,
          error: "This chore is not assigned to you",
        });
      }

      return ctx.render({
        kid,
        family,
        chore,
      });
    } catch (error) {
      console.error("Error loading chore detail:", error);
      return ctx.render({
        kid: null,
        family: null,
        chore: null,
        error: "Failed to load chore",
      });
    }
  },

  async POST(req, ctx) {
    const kidId = ctx.params.kid_id;
    const choreId = ctx.params.chore_id;

    try {
      const choreService = new ChoreService();
      const transactionService = new TransactionService();

      // Get the kid and chore
      const kid = await choreService.getFamilyMember(kidId);
      const chore = await choreService.getChoreAssignment(
        choreId,
        kid!.family_id,
      );

      if (!kid || !chore) {
        return ctx.render({
          kid,
          family: null,
          chore,
          error: "Kid or chore not found",
        });
      }

      // Complete the chore
      const result = await choreService.completeChore(
        choreId,
        kidId,
        kid.family_id,
      );

      if (!result.success) {
        return ctx.render({
          kid,
          family: await choreService.getFamily(kid.family_id),
          chore,
          error: result.error || "Failed to complete chore",
        });
      }

      // Record transaction for FamilyScore integration
      await transactionService.recordChoreCompletion(
        choreId,
        chore.point_value,
        chore.chore_template?.name || "Chore",
        kidId,
        kid.family_id,
      );

      // Redirect to success page or back to dashboard
      const headers = new Headers();
      headers.set("location", `/kid/${kidId}/dashboard?completed=${choreId}`);
      return new Response(null, {
        status: 302,
        headers,
      });
    } catch (error) {
      console.error("Error completing chore:", error);

      // Fallback - render with error
      const choreService = new ChoreService();
      const kid = await choreService.getFamilyMember(kidId);
      const chore = kid
        ? await choreService.getChoreAssignment(choreId, kid.family_id)
        : null;

      return ctx.render({
        kid,
        family: kid ? await choreService.getFamily(kid.family_id) : null,
        chore,
        error: "Failed to complete chore",
      });
    }
  },
};

export default function ChoreDetailPage({ data }: PageProps<ChoreDetailData>) {
  const { kid, family, chore, error, success } = data;

  if (error) {
    return (
      <div class="container">
        <div class="header">
          <div>
            <a
              href={kid ? `/kid/${kid.id}/dashboard` : "/"}
              style={{ color: "white", textDecoration: "none" }}
            >
              ← Back
            </a>
          </div>
          <h1>ChoreGami 2026</h1>
          <div></div>
        </div>
        <div class="card">
          <p style={{ color: "var(--color-warning)", textAlign: "center" }}>
            {error}
          </p>
          <a
            href={kid ? `/kid/${kid.id}/dashboard` : "/"}
            class="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="container">
      <div class="header">
        <div>
          <a
            href={`/kid/${kid.id}/dashboard`}
            style={{ color: "white", textDecoration: "none" }}
          >
            ← Back
          </a>
        </div>
        <h1>{chore?.chore_template?.name || "Chore Detail"}</h1>
        <div></div>
      </div>

      <ChoreDetail
        kid={kid}
        family={family}
        chore={chore}
      />
    </div>
  );
}
