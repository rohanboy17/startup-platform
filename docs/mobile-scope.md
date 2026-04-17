# FreeEarnHub Mobile App Scope (User + Business)

This document is a practical checklist of what should (and should not) be copied from the production web app into the mobile app.

Guiding principles for mobile v1:
- Mobile is for fast execution: "find work -> submit -> track review -> wallet" and "post work -> review applicants -> manage spend".
- Admin + Manager remain web-only for launch safety (2FA/IP policy, full audit tooling).
- Keep text light, but always show workflow stage and "what happens next".

## 1) Roles In Mobile v1

In scope:
- USER (worker)
- BUSINESS (publisher/hiring)

Out of scope (web-only):
- ADMIN
- MANAGER

## 2) USER: What To Include (Mobile v1)

Must ship:
- Home (overview)
  - Wallet balance + pending payout
  - Work pipeline status (under review / manager / admin / approved / rejected)
  - Daily goal and progress
  - Level + benefits preview
  - Recent payouts / live activity (anonymized)
- Work (campaigns list)
  - Search + category chips
  - Task cards: reward, difficulty, slots remaining, moderated indicator
- Task details + submission
  - Reward block
  - Instructions (step-based)
  - Proof inputs (link/text/image url)
  - Submit -> success feedback -> go to Reviews
- Reviews (submissions)
  - List with mini timeline
  - Details with timeline UI and proof recap
- Jobs (list + details)
  - Browse approved jobs
  - Apply with optional cover note
  - Application status shown (APPLIED/SHORTLISTED/INTERVIEW_SCHEDULED/HIRED/etc)
- Wallet
  - Balance + totals
  - Withdrawal request
  - Transactions with clear credit/debit wording
- Profile (basic)
  - Name/email/mobile
  - Skills/preferences summary (read-only in v1 if editing is heavy)

Nice-to-have (after v1):
- Withdrawals history page (separate from Wallet)
- Notifications inbox + push token registration
- Referrals + referral code sharing
- Job applications list (separate from Jobs browse)
- Settings (language/theme, account actions)
- Earn Ads / perks (only if enabled on web and safe for launch)

## 3) BUSINESS: What To Include (Mobile v1)

Must ship:
- Business Dashboard (overview)
  - Wallet balance + spend
  - Active campaigns + active jobs counts
  - Applicants/review queues summary
- Campaigns list + campaign details (read)
- Create Campaign (write)
  - Uses the same work taxonomy as web (categories/types)
  - Budget + reward + instructions + links
- Jobs list (read)
- Job create (write) (optional for v1; include if business usage needs it immediately)
- Applicants
  - Campaign applicants (submissions list filtered for this business)
  - Job applicants (applications list for this business)
  - Minimal actions: shortlist/hire/reject (chat only after admin approval if enabled later)
- Business Wallet (read)
  - Funding status and balance

Nice-to-have (after v1):
- Funding / Razorpay checkout from mobile (requires careful webview/deep-link handling)
- KYC submission + status
- Team management (invite/revoke, role controls)
- Notifications + activity feed
- Trust / compliance panels (summary only)
- Analytics (full charts, exports)

## 4) What Stays Web-Only (Launch)

- Admin panel (campaign approvals, withdrawals approvals, compliance, CMS, audit logs, security rules, interviews)
- Manager panel (submission review queue, risk-only mode)
- Bulk actions and exports
- IP allowlist management and admin 2FA flows

## 5) Backend APIs The Mobile App Should Rely On

USER:
- `POST /api/mobile/auth/login` and `GET /api/mobile/auth/me` (mobile bearer token)
- `GET /api/v2/users/me/overview` (home dashboard data)
- `GET /api/v2/campaigns` (work list)
- `GET/POST /api/v2/campaigns/[campaignId]/submissions` (task details + submit)
- `GET /api/v2/users/me/submissions` (reviews)
- `GET /api/v2/jobs` + `POST /api/v2/jobs/[jobId]/apply` (jobs + apply)
- `GET /api/v2/users/me/wallet` + `POST /api/wallet/withdraw` (wallet + withdraw)

BUSINESS:
- `GET /api/v2/business/overview`
- `GET /api/v2/business/campaigns` + `POST /api/v2/business/campaigns`
- `GET /api/v2/business/jobs` + `POST /api/v2/business/jobs` (if enabled)
- `GET /api/work-taxonomy` (shared taxonomy)

## 6) Notes About Consistency With Web

- Taxonomy: categories/types should come from the same source used by web (`/api/work-taxonomy`) to avoid drift.
- Money flow: business budgets should only be debited after admin approval (web behavior). Mobile copy should match that.
- Workflow visibility: always show the stage (submitted -> manager -> admin -> outcome) to build trust.

