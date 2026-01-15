# ChoreGami 2026 - Deno Fresh Dockerfile for Fly.io
FROM denoland/deno:2.0.0

# Set working directory
WORKDIR /app

# Copy dependency files first
COPY deno.json ./
COPY main.ts dev.ts ./
COPY fresh.gen.ts fresh.config.ts ./

# Copy all source code (needed for fresh.gen.ts imports)
COPY routes/ routes/
COPY islands/ islands/
COPY components/ components/
COPY lib/ lib/
COPY static/ static/
COPY utils/ utils/

# Cache dependencies after all files are copied
RUN deno cache main.ts dev.ts

# Build Fresh islands for production (generates JS chunks)
RUN deno run -A dev.ts build

# Expose port that Fresh uses
EXPOSE 8001

# Health check for Fly.io monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD deno run --allow-net --no-prompt -e "fetch('http://localhost:8001/health').then(r => r.ok ? Deno.exit(0) : Deno.exit(1))" || exit 1

# Production command - allow all permissions for Fresh app
CMD ["deno", "run", "--allow-all", "--no-prompt", "main.ts"]