# Admin Page Access Control Architecture

**Date**: February 6, 2026
**Status**: Implemented
**Category**: Security Architecture

---

## Overview

ChoreGami admin pages use **staff email-based access control** to restrict sensitive functionality to authorized personnel only. This document describes the implementation pattern, authorized users, and how to add new admin pages.

---

## Access Control Model

### Staff Email Validation

All admin pages use the `isStaffEmail()` function from `lib/auth/staff.ts`:

```typescript
import { isStaffEmail } from "../../lib/auth/staff.ts";

function isStaffEmail(email: string): boolean {
  const staffDomains = ["@choregami.com", "@choregami.app", "@probuild365.com"];
  const staffEmails = [
    "support@choregami.com",
    "admin@choregami.com",
    "gk@probuild365.com",
  ];

  return staffEmails.includes(email) ||
    staffDomains.some((domain) => email.endsWith(domain));
}
```

### Authorized Access

| Type | Examples | Access |
|------|----------|--------|
| **Staff Domains** | `anyone@choregami.com`, `anyone@choregami.app`, `anyone@probuild365.com` | Full admin access |
| **Specific Emails** | `support@choregami.com`, `admin@choregami.com`, `gk@probuild365.com` | Full admin access |
| **All Other Users** | Any other authenticated email | Access denied (403) |

---

## Authentication Flow

### Page-Level Security Pattern

Every admin page follows this handler pattern:

```typescript
import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { isStaffEmail, getAccessDeniedHtml } from "../../lib/auth/staff.ts";

export const handler: Handlers<AdminPageData> = {
  async GET(req, ctx) {
    // Step 1: Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.email) {
      const returnUrl = encodeURIComponent(req.url);
      return new Response(null, {
        status: 302,
        headers: { Location: `/login?returnTo=${returnUrl}` },
      });
    }

    // Step 2: Check staff access
    if (!isStaffEmail(session.user.email)) {
      console.log(`Unauthorized admin access attempt by ${session.user.email}`);
      return new Response(getAccessDeniedHtml(session.user.email), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Step 3: Render admin interface
    console.log(`Staff access authorized for ${session.user.email}`);
    return ctx.render({ staffEmail: session.user.email });
  },
};
```

### API-Level Security Pattern

Admin API endpoints follow this pattern:

```typescript
import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";

export const handler: Handlers = {
  async POST(req) {
    // Step 1: Check authentication
    const session = await getAuthenticatedSession(req);
    if (!session.isAuthenticated || !session.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Step 2: Check staff access
    if (!isStaffEmail(session.user.email)) {
      console.log(`Unauthorized admin access attempt by ${session.user.email}`);
      return Response.json({
        error: "Staff access required",
        authorized_domains: ["@choregami.com", "@choregami.app", "@probuild365.com"],
      }, { status: 403 });
    }

    // Step 3: Process admin request
    // ... admin logic here
  },
};
```

---

## File Structure

### Core Files

| File | Purpose |
|------|---------|
| `lib/auth/staff.ts` | Staff email validation + access denied HTML |
| `lib/auth/session.ts` | Session authentication (used by all routes) |

### Admin Pages Pattern

```
routes/
├── admin/
│   ├── gift-codes.tsx          # Gift code management
│   └── [future-admin-page].tsx # Future admin pages
└── api/
    └── admin/
        ├── gift-codes/
        │   ├── generate.ts     # Batch code generation
        │   ├── list.ts         # Code listing
        │   └── stats.ts        # Statistics
        └── [future-api]/       # Future admin APIs
```

---

## Current Admin Pages

### Gift Code Admin (`/admin/gift-codes`)

**Purpose**: Generate, view, and manage gift codes for distribution

**Features**:
- Generate batch codes (1-100 at a time)
- View pending (unused) codes
- View redeemed codes with **assigned email** and **subscription expiry date**
- Financial dashboard (revenue by plan type)
- 2-minute idle auto-logout with warning modal
- Logout button in header

**API Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/gift-codes/generate` | POST | Generate batch of codes |
| `/api/admin/gift-codes/list` | GET | List codes with status filter |
| `/api/admin/gift-codes/stats` | GET | Financial statistics |

**Files**:
- `routes/admin/index.tsx` - Admin dashboard landing
- `routes/admin/gift-codes.tsx` - Gift code management page
- `islands/GiftCodeAdmin.tsx` - Interactive UI
- `islands/AdminIdleTimeout.tsx` - 2-min idle timeout component
- `routes/api/admin/gift-codes/generate.ts` - Generation API
- `routes/api/admin/gift-codes/list.ts` - List API (includes redeemer email + expiry)
- `routes/api/admin/gift-codes/stats.ts` - Stats API

---

## Adding New Admin Pages

### Step 1: Create the Page Route

Create `routes/admin/[your-feature].tsx`:

```typescript
import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../lib/auth/session.ts";
import { isStaffEmail, getAccessDeniedHtml } from "../../lib/auth/staff.ts";
import YourFeatureIsland from "../../islands/YourFeatureAdmin.tsx";

interface AdminPageData {
  staffEmail: string;
}

export const handler: Handlers<AdminPageData> = {
  async GET(req, ctx) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.user?.email) {
      const returnUrl = encodeURIComponent(req.url);
      return new Response(null, {
        status: 302,
        headers: { Location: `/login?returnTo=${returnUrl}` },
      });
    }

    if (!isStaffEmail(session.user.email)) {
      return new Response(getAccessDeniedHtml(session.user.email), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    return ctx.render({ staffEmail: session.user.email });
  },
};

export default function YourFeatureAdminPage({ data }: PageProps<AdminPageData>) {
  return (
    <div class="admin-page">
      {/* Header with logo and staff badge */}
      <header class="admin-header">
        <a href="/" class="logo">ChoreGami</a>
        <div class="header-right">
          <span class="staff-badge">Staff</span>
          <span class="staff-email">{data.staffEmail}</span>
        </div>
      </header>

      <main class="admin-main">
        <YourFeatureIsland staffEmail={data.staffEmail} />
      </main>
    </div>
  );
}
```

### Step 2: Create API Endpoints (if needed)

Create `routes/api/admin/[your-feature]/[action].ts`:

```typescript
import { Handlers } from "$fresh/server.ts";
import { getAuthenticatedSession } from "../../../../lib/auth/session.ts";
import { isStaffEmail } from "../../../../lib/auth/staff.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getAuthenticatedSession(req);

    if (!session.isAuthenticated || !session.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!isStaffEmail(session.user.email)) {
      return Response.json({ error: "Staff access required" }, { status: 403 });
    }

    // Your admin logic here
    const body = await req.json();
    // ... process request

    return Response.json({ success: true });
  },
};
```

### Step 3: Create the Island Component

Create `islands/YourFeatureAdmin.tsx` with interactive UI.

### Step 4: Document the New Admin Page

Update this document with the new admin page details.

---

## Security Considerations

### Multi-Layer Protection

1. **Authentication Required**: Valid Supabase session (cookie-based)
2. **Email Validation**: Email must match staff patterns
3. **Logging**: All access attempts logged with email addresses
4. **Consistent UX**: Same access denied page across all admin tools
5. **Idle Timeout**: Auto-logout after 2 minutes of inactivity (security for shared devices)

### Access Denied Response

Non-staff users see a friendly error page:

```
🚫 Access Denied
Admin access is restricted to ChoreGami staff only.

Your email: user@example.com

Authorized domains:
@choregami.com, @choregami.app, @probuild365.com

[Back to ChoreGami]
```

### Security Logging

```typescript
// Unauthorized attempts are logged
console.log(`Unauthorized admin access attempt by ${session.user.email}`);

// Authorized access is logged
console.log(`Staff access authorized for ${session.user.email}`);
```

---

## Modifying Staff Access

### Adding a New Staff Domain

Edit `lib/auth/staff.ts`:

```typescript
const STAFF_DOMAINS = [
  "@choregami.com",
  "@choregami.app",
  "@probuild365.com",
  "@newdomain.com",  // Add new domain
];
```

### Adding a Specific Staff Email

Edit `lib/auth/staff.ts`:

```typescript
const STAFF_EMAILS = [
  "support@choregami.com",
  "admin@choregami.com",
  "gk@probuild365.com",
  "newperson@external.com",  // Add specific email
];
```

---

## Testing Admin Access

### Local Development

1. Log in with a staff email (e.g., `gk@probuild365.com`)
2. Navigate to `/admin/gift-codes`
3. Verify admin UI loads correctly

### Testing Access Denied

1. Log in with a non-staff email
2. Navigate to `/admin/gift-codes`
3. Verify 403 page with correct messaging

### API Testing

```bash
# Test with valid staff cookie
curl -X POST http://localhost:8000/api/admin/gift-codes/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_STAFF_TOKEN" \
  -d '{"plan_type": "school_year", "quantity": 5}'

# Test without authentication (should return 401)
curl -X POST http://localhost:8000/api/admin/gift-codes/generate \
  -H "Content-Type: application/json" \
  -d '{"plan_type": "school_year", "quantity": 5}'
```

---

## Related Documentation

- [Template Gating & Gift Codes](../milestones/20260118_template_gating_gift_codes.md) - Gift code system overview
- [Session Management](../session-management.md) - Authentication system
- [Stripe Checkout Implementation](../milestones/20260206_stripe_checkout_implementation.md) - Payment integration

---

## Future Enhancements

### Potential Admin Pages

| Feature | Purpose | Priority |
|---------|---------|----------|
| User Management | View/manage user accounts | Medium |
| Analytics Dashboard | Business metrics | Medium |
| Feature Flags | Toggle features | Low |
| Support Tools | Customer support utilities | Low |

### Implemented Security Enhancements (Feb 7, 2026)

- ✅ **Session Timeouts**: 2-minute idle auto-logout with 30-second warning modal
- ✅ **Logout Button**: Visible logout button on all admin pages
- ✅ **Detailed Code Tracking**: Redeemer email and subscription expiry shown in gift code list

### Potential Future Enhancements

- **Role-Based Access**: Different admin roles (support, developer, owner)
- **Two-Factor Authentication**: Enhanced security for admin access
- **Activity Logging**: Detailed audit trail of admin actions

---

**Author**: Development Team
**Created**: February 6, 2026
**Last Updated**: February 7, 2026
