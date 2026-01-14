#!/usr/bin/env -S deno run -A --watch=static/,routes/

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

import "@std/dotenv/load";

const port = parseInt(Deno.env.get("PORT") ?? "8001");
const hostname = Deno.env.get("HOSTNAME") ?? "0.0.0.0";
const isDev = Deno.env.get("DENO_ENV") !== "production";

console.log(`🚀 Starting ChoreGami 2026 on ${hostname}:${port}`);
console.log(`🌍 Region: ${Deno.env.get("FLY_REGION") || "local"}`);
console.log(`🏗️  Environment: ${Deno.env.get("DENO_ENV") || "development"}`);

if (isDev) {
  // Development mode with file watching
  const { default: dev } = await import("$fresh/dev.ts");
  await dev(import.meta.url, "./main.ts", config);
} else {
  // Production mode
  await start(manifest, { 
    ...config, 
    port, 
    hostname,
    // Optimize for Fly.io deployment
    server: {
      port,
      hostname,
      // Enable keep-alive for better WebSocket performance
      reuseAddress: true
    }
  });
}
