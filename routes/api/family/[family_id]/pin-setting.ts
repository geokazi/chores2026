/**
 * Family PIN Setting API Route
 * Handles toggling children PIN requirement
 */

import { Handlers } from "$fresh/server.ts";
import { ChoreService } from "../../../../lib/services/chore-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const familyId = ctx.params.family_id;

    try {
      const body = await req.json();
      const { children_pins_enabled } = body;

      if (typeof children_pins_enabled !== "boolean") {
        return new Response(
          JSON.stringify({ error: "children_pins_enabled must be a boolean" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const choreService = new ChoreService();

      // Update family PIN setting
      const success = await choreService.updateFamilyPinSetting(
        familyId,
        children_pins_enabled,
      );

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to update PIN setting" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          children_pins_enabled,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error updating PIN setting:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
