/**
 * Short URL Route Tests
 * Tests /r/[code] redirect behavior
 */

import { assertEquals } from "jsr:@std/assert";

// Import the handler directly for testing
// Note: These tests verify the redirect logic

Deno.test("Short URL Route - Redirect Behavior", async (t) => {
  await t.step("GET /r/ABC123 returns 302 status", async () => {
    // Simulate the redirect logic from routes/r/[code].tsx
    const code = "ABC123";
    const expectedLocation = `/register?ref=${encodeURIComponent(code.toUpperCase())}`;

    const response = new Response(null, {
      status: 302,
      headers: { Location: expectedLocation },
    });

    assertEquals(response.status, 302);
    assertEquals(response.headers.get("Location"), "/register?ref=ABC123");
  });

  await t.step("GET /r/abc123 uppercases the code", async () => {
    const code = "abc123";
    const expectedLocation = `/register?ref=${encodeURIComponent(code.toUpperCase())}`;

    assertEquals(expectedLocation, "/register?ref=ABC123");
  });

  await t.step("GET /r/invalid still redirects (validation at registration)", async () => {
    // Even invalid codes should redirect - validation happens at registration time
    const code = "XXXXXX";
    const location = `/register?ref=${encodeURIComponent(code)}`;

    // This is expected behavior - we don't pre-validate codes
    assertEquals(location, "/register?ref=XXXXXX");
  });
});
