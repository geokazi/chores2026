/**
 * Device Fingerprint Unit Tests
 * Tests device hash validation logic
 */

import { assertEquals } from "jsr:@std/assert";
import { isValidDeviceHash } from "../lib/device-fingerprint.ts";

Deno.test({
  name: "Device Fingerprint - Hash Validation",
  fn: async (t) => {
    await t.step("accepts valid 64-char hex hash", () => {
      const validHash = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      assertEquals(isValidDeviceHash(validHash), true);
    });

    await t.step("accepts lowercase hex characters", () => {
      const hash = "0123456789abcdef".repeat(4);
      assertEquals(isValidDeviceHash(hash), true);
    });

    await t.step("rejects empty string", () => {
      assertEquals(isValidDeviceHash(""), false);
    });

    await t.step("rejects short hash", () => {
      assertEquals(isValidDeviceHash("abc123"), false);
    });

    await t.step("rejects long hash", () => {
      assertEquals(isValidDeviceHash("a".repeat(65)), false);
    });

    await t.step("rejects uppercase hex", () => {
      const hash = "ABCDEF0123456789".repeat(4);
      assertEquals(isValidDeviceHash(hash), false);
    });

    await t.step("rejects non-hex characters", () => {
      const hash = "ghijklmnopqrstuv".repeat(4);
      assertEquals(isValidDeviceHash(hash), false);
    });

    await t.step("rejects null/undefined", () => {
      assertEquals(isValidDeviceHash(null as any), false);
      assertEquals(isValidDeviceHash(undefined as any), false);
    });
  },
});

Deno.test({
  name: "Device Fingerprint - SHA-256 Format",
  fn: async (t) => {
    await t.step("SHA-256 produces 64 hex characters", async () => {
      const data = "test data";
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      assertEquals(hashHex.length, 64);
      assertEquals(isValidDeviceHash(hashHex), true);
    });

    await t.step("same input produces same hash", async () => {
      const data = "consistent data";
      const encoder = new TextEncoder();

      const hash1Buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hash1 = Array.from(new Uint8Array(hash1Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const hash2Buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hash2 = Array.from(new Uint8Array(hash2Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      assertEquals(hash1, hash2);
    });

    await t.step("different input produces different hash", async () => {
      const encoder = new TextEncoder();

      const hash1Buffer = await crypto.subtle.digest('SHA-256', encoder.encode("data1"));
      const hash1 = Array.from(new Uint8Array(hash1Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const hash2Buffer = await crypto.subtle.digest('SHA-256', encoder.encode("data2"));
      const hash2 = Array.from(new Uint8Array(hash2Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      assertEquals(hash1 !== hash2, true);
    });
  },
});
