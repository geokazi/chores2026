# Navigation UX Improvements

**Date**: January 20, 2026
**Status**: Complete
**Priority**: P0 (Usability)

## Problem

Navigation between family members required users to:
1. Click "Switch User" in the header menu
2. Navigate to the family selector page (`/`)
3. Select the new user from the grid
4. Wait for page load to the appropriate dashboard

This multi-step process added unnecessary friction, especially on shared family devices where users frequently switch between profiles.

## Solution

### 1. Inline User Switcher

Replaced the "Switch User" button with a direct list of all other family members in the user menu dropdown.

**Location**: `islands/AppHeader.tsx` (lines 173-191)

**Behavior**:
- User menu now shows "Switch to" section with all family members (except current user)
- Each member shows their emoji + name
- Clicking a member immediately navigates to their dashboard:
  - Parents → `/parent/my-chores`
  - Kids → `/kid/dashboard`
- Uses `ActiveKidSessionManager.setActiveKid()` for session-based routing (no GUIDs in URLs)

**Code**:
```tsx
{familyMembers
  .filter((m) => m.id !== currentUser?.id)
  .map((member) => (
    <button
      key={member.id}
      onClick={() => {
        ActiveKidSessionManager.setActiveKid(member.id, member.name);
        window.location.href = member.role === "parent"
          ? "/parent/my-chores"
          : "/kid/dashboard";
      }}
    >
      {member.avatar_emoji || (member.role === "parent" ? "👤" : "🧒")} {member.name}
    </button>
  ))}
```

### 2. Active Nav Indicator

Enhanced the active navigation item styling with a prominent left bar indicator.

**Location**: `islands/AppHeader.tsx` (CSS section)

**Before**: Simple background color change
**After**: Background color + white left bar indicator

**CSS**:
```css
.nav-menu a.active::before, .nav-menu button.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: white;
  border-radius: 0 2px 2px 0;
}
```

### 3. Quick View Links (Pre-existing)

The left navigation menu already included clickable kid shortcuts in the "Quick View" section (lines 107-125), using the same session-based pattern.

## Security

All navigation uses session-based routing:
- No user GUIDs in URLs (path or query params)
- `ActiveKidSessionManager` stores active user in `sessionStorage`
- Server validates session cookies for access control

## Related Files

- `islands/AppHeader.tsx` - Main implementation
- `lib/active-kid-session.ts` - Session management
- `docs/milestones/20260110_secure_session_management.md` - Session security design

## User Experience Impact

| Metric | Before | After |
|--------|--------|-------|
| Steps to switch user | 3-4 clicks + page loads | 2 clicks, 1 page load |
| Time to switch | ~3-5 seconds | ~1-2 seconds |
| Navigation clarity | Moderate (hidden behind button) | High (visible list) |

## Testing

1. Open app as any family member
2. Click user avatar (top-right)
3. Verify all other family members are listed
4. Click a member → should navigate to their dashboard
5. Verify the active nav item shows left bar indicator
