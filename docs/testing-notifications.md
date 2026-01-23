# Testing Email & SMS Notifications

How to manually test the weekly digest via email and SMS without waiting for the Sunday 6am UTC cron.

---

## Prerequisites

| Credential | Required for | Set in |
|-----------|-------------|--------|
| `RESEND_API_KEY` | Email digest | `.env` |
| `TWILIO_ACCOUNT_SID` | SMS digest | `.env` |
| `TWILIO_AUTH_TOKEN` | SMS digest | `.env` |
| `TWILIO_PHONE_NUMBER` | SMS digest | `.env` |
| `CRON_SECRET` | HTTP trigger | `.env` |

---

## Test Email Digest

### 1. Find your parent profile

```sql
SELECT id, name, user_id, family_id, preferences
FROM family_profiles
WHERE role = 'parent' AND user_id IS NOT NULL;
```

### 2. Opt-in with email channel

```sql
UPDATE family_profiles
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{notifications}',
  '{"weekly_summary": true, "digest_channel": "email"}'::jsonb
)
WHERE user_id = 'YOUR_USER_ID';
```

### 3. Trigger the digest

Locally:
```bash
curl "http://localhost:8001/api/cron/weekly-digest?secret=$(grep CRON_SECRET .env | cut -d= -f2)"
```

Production:
```bash
curl "https://choregami.fly.dev/api/cron/weekly-digest?secret=$CRON_SECRET"
```

Expected response:
```json
{"success": true, "sent": 1, "skipped": 0, "errors": 0}
```

### 4. Check inbox

Email arrives from `ChoreGami <noreply@choregami.com>` with subject `Your Family Scorecard — [Family Name]`.

---

## Test SMS Digest

### 1. Identify a phone-registered user

Phone signups have placeholder emails matching `@phone.` pattern:

```sql
SELECT fp.id, fp.name, fp.user_id, fp.family_id
FROM family_profiles fp
WHERE fp.role = 'parent'
  AND fp.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = fp.user_id
    AND (au.phone IS NOT NULL OR au.email LIKE '%@phone.%')
  );
```

### 2. Opt-in with SMS channel

```sql
UPDATE family_profiles
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{notifications}',
  '{"weekly_summary": true, "digest_channel": "sms"}'::jsonb
)
WHERE user_id = 'YOUR_PHONE_USER_ID';
```

### 3. Trigger the digest

```bash
curl "http://localhost:8001/api/cron/weekly-digest?secret=$(grep CRON_SECRET .env | cut -d= -f2)"
```

### 4. Check phone

SMS arrives from `TWILIO_PHONE_NUMBER` with the scorecard summary.

---

## Re-testing (Clear Idempotency Flag)

The digest is idempotent — it won't send twice in the same weekly cycle. To re-test, clear `last_sent_at`:

```sql
UPDATE family_profiles
SET preferences = jsonb_set(
  preferences,
  '{notifications,last_sent_at}',
  '"2020-01-01T00:00:00Z"'::jsonb
)
WHERE user_id = 'YOUR_USER_ID';
```

Then trigger again.

---

## Cleanup (Opt Back Out)

```sql
UPDATE family_profiles
SET preferences = jsonb_set(
  preferences,
  '{notifications,weekly_summary}',
  'false'::jsonb
)
WHERE user_id = 'YOUR_USER_ID';
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `{"sent": 0, "skipped": 1}` | Already sent this cycle | Clear `last_sent_at` (see above) |
| `{"sent": 0, "errors": 1}` | Missing credentials | Check `RESEND_API_KEY` / Twilio vars in `.env` |
| `{"sent": 0, "skipped": 0, "errors": 0}` | Not opted in | Run opt-in SQL above |
| `{"error": "budget_exceeded"}` | Global cap hit | Check `GLOBAL_EMAIL_BUDGET` in `config/feature-limits.ts` |
| SMS not received | SMS monthly limit | Check `FEATURE_LIMITS.free.sms_per_month` (default 4/month) |
| Email to wrong address | Placeholder email | User has `@phone.` email — set `digest_channel: "email"` only if they have a real email |

### Check logs (Fly.io)

```bash
fly logs -a choregami | grep "\[digest\]"
```

### Verify channel detection logic

The digest resolves contact info at send time from `auth.users`:
- `hasRealEmail()` returns `false` for `@phone.choregami.local` and `@phone.mealplanner.internal` patterns
- `resolvePhone()` extracts phone from `user.phone` or from placeholder email prefix
- If `digest_channel` is `"sms"` but no phone found, falls back to email
- If SMS monthly limit hit, auto-falls back to email and flags `sms_limit_hit`

---

## Cross-References

- [Notifications: Calendar + Email + Badges](./milestones/20260122_notifications_calendar_email_badges.md) — Full implementation details
- [Weekly Digest Enhancement](./marketing/20260123_weekly_digest_enhancement.md) — 7-section scorecard design
- [JSONB Settings Architecture](./20260114_JSONB_settings_architecture.md) — `preferences.notifications` schema
- [Usage Queries](../sql/20260122_notifications_usage_queries.sql) — SQL for checking usage counters
