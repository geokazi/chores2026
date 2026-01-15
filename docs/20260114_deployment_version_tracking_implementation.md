# Deployment Version Tracking Implementation Plan

**Date**: January 14, 2026

## Overview

Implement automated deployment version tracking (matching FamilyScore pattern) with a reusable footer component that shows version on hover.

## FamilyScore Implementation Summary (Reference)

**Format**: `prod-v{commit}-{timestamp}` (e.g., `prod-v06ddc5d-20260111.230649`)

**Flow**:
1. Deploy script generates version string from git commit + timestamp
2. Version set as Fly.io secret (`APP_VERSION`)
3. Runtime reads from environment variable
4. UI displays version in footer with hover reveal

---

## Implementation Plan for ChoreGami 2026

### Phase 1: Deploy Script Update

**File**: `deployment/deploy.sh`

**Changes**:
- Add version generation before deploying secrets (lines ~193-210)
- Set `APP_VERSION` as a Fly.io secret

```bash
# Add to deploy_application() function, before secrets deployment:

# Generate deployment version
log_step "Generating deployment version..."
local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
local deploy_timestamp=$(date +%Y%m%d.%H%M%S)
local app_version="prod-v${git_commit}-${deploy_timestamp}"
log_success "Version generated: ${app_version}"

# Later, add to secrets deployment:
fly secrets set -a "$APP_NAME" APP_VERSION="$app_version"
```

---

### Phase 2: Health Endpoint Update

**File**: `routes/health.ts`

**Changes**: Use `APP_VERSION` environment variable instead of hardcoded `"1.0.0"`

```typescript
const version = Deno.env.get("APP_VERSION") || "dev-local";
```

---

### Phase 3: Reusable Footer Component

**New File**: `components/AppFooter.tsx`

A simple server component (not an island) that can be imported into any route.

```tsx
/**
 * App Footer with Version Display
 * Shows deployment version on hover for debugging
 */

interface AppFooterProps {
  style?: "light" | "dark";  // Match page theme
}

export default function AppFooter({ style = "light" }: AppFooterProps) {
  const version = Deno.env.get("APP_VERSION") || "dev-local";
  const isDev = version === "dev-local";

  const textColor = style === "dark" ? "#666" : "var(--color-text-light)";
  const versionColor = style === "dark" ? "#888" : "var(--color-text-light)";

  return (
    <footer
      style={{
        textAlign: "center",
        padding: "1rem",
        marginTop: "2rem",
        borderTop: "1px solid var(--color-border, #eee)",
      }}
    >
      <div
        style={{
          color: textColor,
          fontSize: "12px",
          cursor: "default",
        }}
        class="version-footer"
      >
        Family Chores Made Fun
        <br />
        <span
          class="version-text"
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: versionColor,
            opacity: 0,
            transition: "opacity 0.3s",
          }}
        >
          {version}
        </span>
      </div>
      <style>
        {`
          .version-footer:hover .version-text {
            opacity: 1 !important;
          }
        `}
      </style>
    </footer>
  );
}
```

---

### Phase 4: Integrate Footer into Key Routes

**Routes to update**:

1. **`routes/login.tsx`** - Login page (first thing users see)
2. **`routes/index.tsx`** - Kid selector page
3. **`routes/kid/dashboard.tsx`** - Kid dashboard
4. **`routes/parent/dashboard.tsx`** - Parent dashboard
5. **`routes/parent/settings.tsx`** - Settings page

**Integration pattern** (add before closing `</div>` or at end of page):

```tsx
import AppFooter from "../components/AppFooter.tsx";

// At end of page JSX:
<AppFooter />
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `deployment/deploy.sh` | Modify | Add version generation + APP_VERSION secret |
| `routes/health.ts` | Modify | Use APP_VERSION env var |
| `components/AppFooter.tsx` | **New** | Reusable footer component |
| `routes/login.tsx` | Modify | Import and add AppFooter |
| `routes/index.tsx` | Modify | Import and add AppFooter |
| `routes/kid/dashboard.tsx` | Modify | Import and add AppFooter |
| `routes/parent/dashboard.tsx` | Modify | Import and add AppFooter |
| `routes/parent/settings.tsx` | Modify | Import and add AppFooter |

---

## Version Format

| Environment | Format | Example |
|-------------|--------|---------|
| Production | `prod-v{commit}-{timestamp}` | `prod-v4e19c05-20260115.101530` |
| Development | `dev-local` | `dev-local` |

---

## Testing Plan

1. **Local**: Run `deno task dev` - footer shows "dev-local"
2. **After deploy**: Visit routes - hover on footer shows production version
3. **Health endpoint**: `curl https://choregami.fly.dev/health` returns version in JSON

---

## Benefits

- **Debugging**: Instantly identify deployed code version
- **Rollback correlation**: Version links to exact git commit
- **Non-intrusive**: Hidden until hover, preserves clean UI
- **Reusable**: Single component for all routes
- **Consistent**: Matches FamilyScore versioning pattern

---

## Estimated Changes

- **Lines added**: ~55 lines
- **New files**: 1 (`components/AppFooter.tsx`)
- **Modified files**: 7
- **Breaking changes**: None
