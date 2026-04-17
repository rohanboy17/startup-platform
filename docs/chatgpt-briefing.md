# FreeEarnHub (Startup Platform) - ChatGPT Briefing

This document summarizes the FreeEarnHub website codebase so another assistant can understand the product without reading the entire repo.

## 1) Product Summary

FreeEarnHub is a role-based marketplace for:
- Moderated micro-tasks / campaigns (digital work with submissions and approvals).
- Local job postings and hiring workflow (job applications, admin-verified interviews, messaging with moderation).
- Wallet and ledger flows (user payouts/withdrawals, business funding via Razorpay, platform treasury/earning tracking).

The web app is built with:
- Next.js App Router (`app/`)
- NextAuth credentials auth (`/api/auth/[...nextauth]`)
- Prisma + PostgreSQL (Neon)
- next-intl i18n (en/hi/bn in `messages/`)

There is also a separate Expo mobile app scaffold under `freeearnhub-app/` that connects to this same backend.

## 2) Repo Structure (High Level)

- `app/`: Next.js routes (public pages, dashboards, API routes).
- `components/`: UI components and dashboard panels.
- `lib/`: server utilities (auth, security, notifications, payments, prisma helpers, etc).
- `prisma/`: Prisma schema and migrations.
- `messages/`: i18n message catalogs (`en.json`, `hi.json`, `bn.json`).
- `i18n/`: next-intl request config and locale handling.
- `docs/`: operational docs (notably `docs/route-inventory.md`).
- `freeearnhub-app/`: Expo (React Native) app prototype (dashboard + tasks UX).

## 3) Roles and Apps (Who Sees What)

The system has four main roles with separate dashboards:

### USER
Purpose: browse campaigns/tasks, submit proof, track approval stages, earn wallet credit, request withdrawals, track job applications.
Key routes:
- `/dashboard/user/*` pages
- `GET /api/v2/campaigns` (browse campaigns)
- `POST /api/v2/campaigns/[campaignId]/submissions` (submit)
- `GET /api/v2/users/me/submissions`, `/withdrawals`, `/wallet`, `/notifications`

### BUSINESS
Purpose: create campaigns and job postings, fund wallet, track submissions/applicants, manage team access, see analytics.
Key routes:
- `/dashboard/business/*` pages
- `GET/POST /api/v2/business/campaigns`
- `GET/POST /api/v2/business/jobs`
- `GET /api/v2/business/overview`, `/analytics`, `/activity`, `/notifications`, `/team`, `/settings`

Business wallet funding is real-money and uses Razorpay:
- `POST /api/business/fund/checkout`
- `POST /api/business/fund/verify`
- `POST /api/payments/razorpay/webhook` (idempotent settlement backup)

### MANAGER
Purpose: submissions review queue and escalation workflow (quality + risk checks before admin).
Key routes:
- `/dashboard/manager/submissions`
- `GET /api/v2/manager/submissions`
- `POST /api/v2/submissions/[submissionId]/manager`
- `POST /api/v2/submissions/[submissionId]/manager-escalate`

### ADMIN
Purpose: platform control center (campaign approvals, user/business review, withdrawals, revenue, notifications, settings, compliance, audit logs, interviews, and moderation tools).
Key routes:
- `/dashboard/admin/*` pages
- Campaign control: `/api/v2/admin/campaigns*`
- Submission control: `/api/v2/admin/submissions*`, `/api/v2/submissions/[submissionId]/admin`, `/api/v2/submissions/[submissionId]/escalate`
- Users/businesses: `/api/admin/users/*`, `/api/admin/businesses/wallet`
- Withdrawals: `/api/admin/withdrawals*`
- Revenue/payouts: `/api/admin/revenue/payouts*`
- Notifications: `/api/admin/notifications/*`
- Security/compliance/audit: `/api/admin/security/*`, `/api/admin/compliance/*`, `/api/admin/audit-logs`
- Interviews: `/dashboard/admin/interviews`, `/api/v2/admin/interviews*`
- Job applicant messages + chat flags: `/api/v2/admin/job-applications/[applicationId]/messages`, `/api/v2/admin/job-chat-flags*`

Admin auth specifics:
- NextAuth credential provider with security event logging.
- Admin accounts can require 2FA challenge/OTP (`/api/auth/admin-2fa/request`).
- Admin login can be IP restricted (allowlist rules in DB).

## 4) Core Product Workflows

### A) Campaign (Micro-task) Loop
1. Business creates a campaign (title, description, category/taskCategory/taskType, reward and budget, links/instructions).
2. Campaign is reviewed/approved (admin workflow; manager may review submissions depending on queue).
3. Users submit proof (link/text/image fields supported) and track review stages:
   - `status`, `managerStatus`, `adminStatus`, with escalation metadata.
4. On approval, wallet credit and ledger entries are recorded; rejections include reasons/notes.

### B) Job Posting and Hiring Loop
1. Business creates a job posting (work mode, pay, location/hiring radius, openings, required skills/languages, etc).
2. Admin reviews/approves job posting (PENDING_REVIEW -> approved/rejected).
3. Users apply (JobApplication with cover note, tracked manager/admin statuses).
4. Interviews:
   - Admin can schedule multi-round interviews with mode (virtual/on-site), meeting link/provider, reminders, scorecards, attendance confirmation.
5. Messaging:
   - JobApplicationMessage exists.
   - Chat attempts can be flagged into JobApplicationChatFlag for admin review (moderation layer).
6. Business eventually hires/rejects (status updates on application).

### C) Wallet, Withdrawals, and Funding
User side:
- Wallet balance and ledger via `WalletTransaction`.
- Withdrawals tracked via `Withdrawal` and/or `WithdrawRequest` (separate models exist; current flows include `/api/wallet/withdraw` and v2 user endpoints).

Business side:
- BusinessWallet model tracks funded/spent/refund totals.
- Funding uses Razorpay order creation + signature verification + webhook backup settlement.

Platform side:
- Platform treasury/earnings/payout tracking exists (`PlatformTreasury`, `PlatformEarning`, `PlatformPayout`).

## 5) Data Model (Prisma Concepts)

Key models (simplified, not exhaustive):

### Identity and Access
- `User`: role (USER/BUSINESS/ADMIN), account status, KYC status, skills, notifications, device push tokens, business-team relationships.
- `BusinessKycRequest`: KYC documents and review status.

### Campaigns / Submissions
- `Campaign`: budgeted micro-task campaign; includes category fields + optional slugs for taxonomy stability.
- `CampaignInstruction`: sequenced instructions (used to assign or track submission instructions).
- `Submission`: proof fields + manager/admin statuses + escalation metadata + reward amount.
- `CampaignAssignment`, `CampaignRepeatRequest`: per-user assignment and repeat-access requests.

### Jobs / Hiring
- `JobPosting`: job metadata + pay + location; includes category/type + optional slugs.
- `JobApplication`: user application to a job; includes manager/admin statuses and timestamps.
- `JobApplicationMessage`: messages tied to a job application.
- `JobApplicationInterview`: interview scheduling, meeting link/provider, reminders, attendance, scorecards, multi-round support.
- `JobApplicationChatFlag`: flagged messages for admin moderation review.

### Wallet / Payments / Notifications
- `WalletTransaction`, `Withdrawal`, `WithdrawRequest`: payout operations and ledger.
- `PaymentOrder`, `BusinessWallet`, `BusinessFunding`, `BusinessRefundRequest`: business funding and refunds.
- `DevicePushToken`, `Notification`, `NotificationDeliveryLog`: push notification registration and delivery logging.

## 6) API Families (How the Backend is Organized)

### Auth
- `POST/GET /api/auth/[...nextauth]` (NextAuth)
- `POST /api/register` (create USER/BUSINESS account)
- Password reset: `/api/auth/password/forgot`, `/api/auth/password/reset`
- Admin 2FA: `/api/auth/admin-2fa/request`

### v2 APIs (Current Product Surface)
- User: `/api/v2/users/me/*`, `/api/v2/campaigns*`, `/api/v2/jobs*`
- Business: `/api/v2/business/*`
- Manager: `/api/v2/manager/*`
- Admin: `/api/v2/admin/*` plus `/api/admin/*` for operational panels

### Public / Marketing data
- `GET /api/public/live` (homepage live activity)
- `GET /api/public/hero-metrics` (homepage metrics)
- `POST /api/community-feedback` (feedback collection)

### Mobile token auth (for Expo app)
The web app is cookie/JWT-session based, but mobile needs a bearer token.
- `POST /api/mobile/auth/login` -> returns `{ token, user }`
- `GET /api/mobile/auth/me` -> validates token, checks sessionVersion
Secret:
- `MOBILE_AUTH_SECRET` (recommended) or fallback `NEXTAUTH_SECRET`

## 7) Security and Compliance

### HTTP Security Headers
Configured in `next.config.ts`:
- Deny iframing, nosniff, strict referrer policy, HSTS.
- `Permissions-Policy` disables camera/mic/geolocation by default.

### Login Security
- IP access rules via DB (`checkIpAccess`), security events recorded.
- Admin accounts can require OTP/recovery code verification and can be restricted by allowlist.
- `sessionVersion` is used to revoke sessions across devices.

### Moderation / Privacy
- Job chat flagging exists (`JobApplicationChatFlag`), admin review endpoints exist.
- Legal/compliance tools exist under `/dashboard/admin/compliance` and `/api/admin/compliance/*`.

## 8) Internationalization (i18n)

Locales:
- English `en`, Hindi `hi`, Bengali `bn`.

Implementation:
- `i18n/request.ts` reads locale from cookie `NEXT_LOCALE` and loads `messages/<locale>.json` with fallback to `en`.

## 9) Cron / Scheduled Jobs (Vercel)

Configured in `vercel.json`:
- `/api/cron/reset-levels` at `30 18 * * *`
- `/api/cron/job-interview-reminders` at `0 2 * * *`

Note: Vercel Hobby cron has “once per day” limitations; schedules more frequent can fail deployment.

## 10) Deployment Notes (Vercel + Neon)

Core env vars (see `.env.example` and README checklist):
- DB: `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL` (direct host for migrations)
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optionally `MOBILE_AUTH_SECRET`
- Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Optional thresholds/fees and SMTP providers for notifications

Migrations:
- `npm run db:migrate:deploy` for production deploy migration step.

## 11) Mobile App (Expo) - Current State

Folder: `freeearnhub-app/`
- Expo Router app with auth + tabs.
- Premium screens implemented:
  - Dashboard: `/app/(tabs)/dashboard.tsx`
  - Tasks list: `/app/(tabs)/tasks/index.tsx`
  - Task details: `/app/(tabs)/tasks/[taskId].tsx`

Mobile env:
- `EXPO_PUBLIC_API_BASE_URL` points the mobile app to the backend base URL.
- For local testing, use your LAN IP + `:3000`; for production builds use the Vercel domain.

## 12) Authoritative Route List

For a curated list of “production surface” routes, refer to:
- `docs/route-inventory.md`

