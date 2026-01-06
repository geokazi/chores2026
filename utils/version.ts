/**
 * Git-based version utility for stable cache busting
 * Uses git commit hash to prevent infinite reload loops
 */
export function getAppVersion(): string {
  // First priority: GIT_COMMIT hash (most stable for cache management)
  const gitCommit = Deno.env.get("GIT_COMMIT");
  if (gitCommit && gitCommit !== "unknown") {
    return `git-${gitCommit.substring(0, 7)}`;
  }

  // Second priority: DENO_DEPLOYMENT_ID (for Deno Deploy)
  const deploymentId = Deno.env.get("DENO_DEPLOYMENT_ID");
  if (
    deploymentId && deploymentId !== "unknown" && deploymentId !== "production"
  ) {
    return deploymentId;
  }

  // Third priority: DEPLOYMENT_VERSION (for Cloud Build)
  const deploymentVersion = Deno.env.get("DEPLOYMENT_VERSION");
  if (
    deploymentVersion && deploymentVersion !== "local" &&
    deploymentVersion !== "unknown"
  ) {
    return deploymentVersion;
  }

  // Development fallback: STATIC version (no timestamps to prevent infinite reloads)
  return "dev-local";
}

// Get versioned URL for static assets
export function getVersionedUrl(path: string): string {
  const version = getAppVersion();
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${version}`;
}
