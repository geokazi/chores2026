/**
 * Device ID Generation Security Tests
 *
 * Validates cryptographically secure device ID generation
 */

import { assertEquals, assertMatch } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Test: crypto.randomUUID() produces valid UUID v4 format
Deno.test("device ID - crypto.randomUUID produces valid UUID", () => {
  const uuid = crypto.randomUUID();

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is 8, 9, a, or b
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assertMatch(uuid, uuidRegex);
});

// Test: Device ID format matches expected pattern
Deno.test("device ID - format is device_<uuid>", () => {
  const deviceId = `device_${crypto.randomUUID()}`;

  assertMatch(deviceId, /^device_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

// Test: Each generated UUID is unique
Deno.test("device ID - generates unique values", () => {
  const ids = new Set<string>();

  for (let i = 0; i < 100; i++) {
    ids.add(crypto.randomUUID());
  }

  assertEquals(ids.size, 100, "All 100 generated UUIDs should be unique");
});

// Test: UUID length is consistent
Deno.test("device ID - UUID has consistent length", () => {
  const uuid = crypto.randomUUID();

  assertEquals(uuid.length, 36, "UUID should be 36 characters (including hyphens)");
});

// Test: Device ID total length
Deno.test("device ID - total length is 43 characters", () => {
  const deviceId = `device_${crypto.randomUUID()}`;

  // "device_" (7) + UUID (36) = 43
  assertEquals(deviceId.length, 43);
});

// Test: No predictable patterns (unlike Math.random + Date.now)
Deno.test("device ID - crypto.randomUUID is not predictable from timestamp", () => {
  const before = Date.now();
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const after = Date.now();

  // UUIDs generated in same millisecond should still be different
  assertEquals(uuid1 !== uuid2, true, "UUIDs should differ even in same millisecond");

  // UUIDs should not contain timestamp
  assertEquals(uuid1.includes(before.toString()), false);
  assertEquals(uuid1.includes(after.toString()), false);
});

// Test: Web Crypto API is available
Deno.test("device ID - Web Crypto API is available", () => {
  assertEquals(typeof crypto, "object");
  assertEquals(typeof crypto.randomUUID, "function");
});
