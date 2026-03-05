# EarnHub (Startup Platform)

Role-based micro-task marketplace with:
- Next.js App Router + NextAuth
- Prisma + PostgreSQL (Neon)
- USER / BUSINESS / ADMIN flows
- Wallet ledger, submissions, withdrawals, treasury
- Razorpay business wallet funding (real payment flow)

## 1) Setup

```bash
npm install
cp .env.example .env
```

Fill required `.env` values.

## 2) Prisma

Generate client:

```bash
npx prisma generate
```

Apply migrations (uses `DIRECT_DATABASE_URL` automatically if present in `prisma.config.ts`):

```bash
npx prisma migrate deploy
```

If Neon lock error `P1002` appears, ensure:
- `DIRECT_DATABASE_URL` points to direct Neon host (not `-pooler`)
- no other Prisma process is running
- retry `npm run db:migrate:deploy`

## 3) Run

```bash
npm run dev
```

## Real Payment Funding Flow

Business wallet funding now uses Razorpay:

1. `POST /api/business/fund/checkout` creates Razorpay order + local `PaymentOrder`.
2. Checkout completes on client.
3. Server verifies signature via `POST /api/business/fund/verify`.
4. Webhook `POST /api/payments/razorpay/webhook` provides idempotent backup settlement.
5. Wallet is credited atomically and ledger entry is recorded.

Legacy direct credit endpoint `POST /api/business/fund` is disabled.

## Production Checklist

- Set all secrets in deployment environment (never commit secrets).
- Configure Razorpay webhook URL:
  - `https://your-domain.com/api/payments/razorpay/webhook`
- Use HTTPS and valid `NEXTAUTH_URL`.
- Use direct DB URL for migrations, pooled URL for app traffic.
- Keep `RAZORPAY_KEY_SECRET`, `NEXTAUTH_SECRET`, SMTP creds server-side only.

## Safe Legacy Cleanup (Neon-safe)

Legacy `Task` model and `Submission.taskId` are currently deprecated in code but still present in DB for safety.

1. Run read-only legacy report:
```bash
npm run db:legacy:report
```

2. Run strict preflight (fails if legacy rows still exist):
```bash
npm run db:legacy:strict
```

3. Only when strict preflight passes (`safeToDropLegacyTaskSchema: true`), plan destructive migration.

4. Before destructive migration on production:
- create Neon backup/branch snapshot first
- run migration on a staging branch DB first
- then deploy to production

## Deploy on Vercel + Neon

1. Neon:
- Copy pooled connection string -> set as `DATABASE_URL`
- Copy direct connection string -> set as `DIRECT_DATABASE_URL`

2. Vercel Project Environment Variables:
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `NEXTAUTH_URL` (your Vercel domain)
- `NEXTAUTH_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- Optional: `MIN_FUNDING_THRESHOLD`, `NEXT_PUBLIC_MIN_FUNDING_THRESHOLD`, `MIN_WITHDRAWAL_AMOUNT`, `WITHDRAWAL_COMMISSION_RATE`, SMTP vars

3. Before first production deploy, apply migrations once:
```bash
npm run db:migrate:deploy
```

4. Deploy on Vercel (Git import or `vercel --prod`).

5. In Razorpay Dashboard, set webhook:
- URL: `https://<your-domain>/api/payments/razorpay/webhook`
- Event: `payment.captured`
