/**
 * PIN Verification API Route
 * Handles kid PIN verification with database backup
 */

import { Handlers } from "$fresh/server.ts";
import { ChoreService } from "../../../lib/services/chore-service.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { kid_id, pin, setup_mode } = body;

      if (!kid_id || !pin) {
        return new Response(
          JSON.stringify({ error: "Missing kid_id or pin" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const choreService = new ChoreService();

      if (setup_mode) {
        // Setting up a new PIN
        const hashedPin = await bcrypt.hash(pin, 10);
        const success = await choreService.setKidPin(kid_id, hashedPin);

        if (!success) {
          return new Response(
            JSON.stringify({ error: "Failed to set PIN" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            setup: true,
            hash: hashedPin,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        // Verifying existing PIN
        const storedHash = await choreService.getKidPin(kid_id);

        if (!storedHash) {
          return new Response(
            JSON.stringify({
              error: "No PIN set",
              setup_required: true,
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const isValid = await bcrypt.compare(pin, storedHash);

        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid PIN" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
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
