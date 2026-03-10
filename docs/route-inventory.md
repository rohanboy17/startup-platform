# Route Inventory

This file marks which routes are part of the current production surface, which are internal-only, and which legacy routes have already been removed.

## Production Routes

### Auth and session
- `/api/auth/[...nextauth]`
- `/login`
- `/register`
- `/api/register`

### User app
- `/dashboard/user`
- `/dashboard/user/tasks`
- `/dashboard/user/submissions`
- `/dashboard/user/wallet`
- `/dashboard/user/withdrawals`
- `/dashboard/user/notifications`
- `/api/v2/campaigns`
- `/api/v2/campaigns/[campaignId]/submissions`
- `/api/v2/users/me/submissions`
- `/api/v2/users/me/withdrawals`
- `/api/wallet/withdraw`

### Business app
- `/dashboard/business`
- `/dashboard/business/campaigns`
- `/dashboard/business/campaigns/[campaignId]`
- `/dashboard/business/create`
- `/dashboard/business/analytics`
- `/dashboard/business/funding`
- `/dashboard/business/reviews`
- `/dashboard/business/notifications`
- `/dashboard/business/trust`
- `/dashboard/business/activity`
- `/dashboard/business/settings`
- `/dashboard/business/team`
- `/api/v2/business/overview`
- `/api/v2/business/campaigns`
- `/api/v2/business/campaigns/[campaignId]`
- `/api/v2/business/analytics`
- `/api/v2/business/funding`
- `/api/v2/business/submissions`
- `/api/v2/business/notifications`
- `/api/v2/business/activity`
- `/api/v2/business/settings`
- `/api/v2/business/team`
- `/api/v2/business/wallet/fund`
- `/api/v2/business/wallet/refund`
- `/api/business/fund/checkout`
- `/api/business/fund/verify`

### Manager app
- `/dashboard/manager`
- `/dashboard/manager/submissions`
- `/api/v2/manager/submissions`
- `/api/v2/submissions/[submissionId]/manager`

### Admin app
- `/dashboard/admin`
- `/dashboard/admin/risk`
- `/dashboard/admin/campaigns`
- `/dashboard/admin/reviews`
- `/dashboard/admin/users`
- `/dashboard/admin/businesses`
- `/dashboard/admin/withdrawals`
- `/dashboard/admin/revenue`
- `/dashboard/admin/notifications`
- `/dashboard/admin/settings`
- `/dashboard/admin/compliance`
- `/dashboard/admin/cms`
- `/dashboard/admin/audit`
- `/api/v2/admin/campaigns`
- `/api/v2/admin/campaigns/[campaignId]`
- `/api/v2/admin/campaigns/escalate`
- `/api/v2/admin/submissions`
- `/api/v2/admin/submissions/bulk`
- `/api/v2/submissions/[submissionId]/admin`
- `/api/v2/submissions/[submissionId]/escalate`
- `/api/admin/analytics`
- `/api/admin/users/*`
- `/api/admin/businesses/wallet`
- `/api/admin/withdrawals`
- `/api/admin/withdrawals/[withdrawalId]`
- `/api/admin/revenue/payouts`
- `/api/admin/revenue/payouts/[payoutId]`
- `/api/admin/revenue/payouts/export`
- `/api/admin/notifications/broadcast`
- `/api/admin/notifications/templates`
- `/api/admin/notifications/delivery-logs`
- `/api/admin/settings`
- `/api/admin/settings/env-checks`
- `/api/admin/security/2fa`
- `/api/admin/security/2fa/recovery-codes`
- `/api/admin/security/events`
- `/api/admin/security/events/[eventId]`
- `/api/admin/security/ip-rules`
- `/api/admin/cms/content`
- `/api/admin/cms/announcements`
- `/api/admin/cms/feature-flags`
- `/api/admin/compliance/legal-evidence`
- `/api/admin/compliance/users/[userId]/export`
- `/api/admin/compliance/users/[userId]/delete`
- `/api/admin/export/users`
- `/api/admin/audit-logs`
- `/api/admin/finance/adjustments`
- `/api/admin/finance/adjustments/[requestId]`
- `/api/admin/fund-business`

### Public / marketing / legal
- `/`
- `/about`
- `/contact`
- `/terms`
- `/privacy`
- `/refund-policy`
- `/cookie-policy`
- `/disclaimer`
- `/kyc-policy`
- `/faq`
- `/api/public/live`

## Internal Routes

These are operational and should not be treated as user-facing product APIs.

- `/api/cron/reset-levels`
- `/api/payments/razorpay/webhook`
- `/api/presence/ping`
- `/api/nav-alerts`
- `/api/notifications/read`

## Removed Legacy Routes

These were compatibility shims and are no longer part of the codebase.

- `/api/admin/tasks`
- `/api/admin/tasks/[taskId]`
- `/api/admin/submissions`
- `/api/admin/submissions/[submissionId]`
- `/api/business/tasks`
- `/api/tasks`
- `/api/tasks/[taskId]/submit`
- `/api/business/fund`

## Guidance

- New work should target `v2` routes for business, manager, admin, and user task/submission flows.
- Keep `/api/wallet/withdraw` until the user withdrawal flow is intentionally migrated to a `v2` route.
- Keep `/api/business/fund/checkout` and `/api/business/fund/verify` because the live funding UI still uses them.
