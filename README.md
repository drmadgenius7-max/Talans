# قِطّة | Qitta

منصة سعودية لإدارة الأموال والمصاريف المشتركة بين الأفراد — تقسيم فواتير، مطالبات مالية، تسوية ذكية، ودفع تشاركي، في تطبيق واحد.

**الحسبة علينا.**

This is a real, working full-stack application — not a prototype or a landing page. Authentication, database, every split method, the debt-simplification settlement engine, mock payments with a full webhook-verified lifecycle, shared-payment crowdfunding, notifications, an admin dashboard, and a public marketing site are all implemented and wired end to end. What's left before a commercial launch is listed in [What's Left](#whats-left-before-a-commercial-launch) below — deployment, English content, a real payment gateway, and legal review — by design, not because the rest is unfinished.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + a small hand-rolled shadcn/ui-style component library on **Radix UI**
- **PostgreSQL** + **Prisma ORM**
- Custom cookie/DB-session auth (bcrypt password hashing, hashed session tokens) — no third-party auth vendor lock-in
- **Zod** validation, **React Hook Form**
- **Recharts** for analytics, `qrcode` for QR generation
- **Vitest** for unit tests, **Playwright** for end-to-end tests

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env if your local PostgreSQL isn't at the default DATABASE_URL

# 3. Create the database (adjust to your local Postgres setup)
createdb qitta_dev   # or: psql -c "CREATE DATABASE qitta_dev"

# 4. Apply the schema
npm run db:migrate

# 5. Seed demo data (optional but recommended — see below)
npm run db:seed

# 6. Run the dev server
npm run dev
```

Open http://localhost:3000. Log in with the seeded demo account (see below), or sign up for a fresh one.

## Demo account

`npm run db:seed` creates four linked accounts sharing three groups, a shared payment campaign, and several payment requests, so the app doesn't feel empty on first look. Seed data is intentionally separate from anything a real signup creates — it's driven by `prisma/seed.ts` and gated by `ENABLE_DEMO_SEED` (see `.env.example`); it refuses to run in production unless you explicitly opt in.

| Email | Password | Notes |
| --- | --- | --- |
| `demo@qitta.sa` | `Demo1234` | Primary account, also an **admin** — visit `/admin` |
| `mohammed@qitta.sa` | `Demo1234` | |
| `sara@qitta.sa` | `Demo1234` | |
| `fahad@qitta.sa` | `Demo1234` | |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) — split engine, money math, debt simplification |
| `npm run test:e2e` | End-to-end tests (Playwright) — the three critical flows below |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:seed` | Populate demo data |
| `npm run db:studio` | Prisma Studio, a GUI for the database |

## Architecture

```
src/
  app/                    Next.js App Router routes
    (marketing)/          Public site: home, how-it-works, features, FAQ, legal, about, contact
    (auth)/                login, signup, forgot/reset password
    (app)/                 the logged-in product: dashboard, groups, expenses, friends,
                           insights, notifications, settings, search
    admin/                 role-gated admin dashboard
    pay/[token]/            public payment-request page (no login required)
    pay/simulate/[id]/      mock payment simulator
    qitta/[token]/          public shared-payment (crowdfunding) contribution page
    invite/[token]/         group invite acceptance
    api/                   webhook + file upload/serving route handlers
  server/                 business logic, one module per domain — see below
  lib/                    framework-agnostic utilities (money, currency, time, validation, tokens)
  components/             UI: ui/ (generic primitives), everything else is feature-specific
e2e/                      Playwright end-to-end tests
prisma/                   schema, migrations, seed script
```

`src/server/` is organized by domain, not by technical layer — each folder owns its validation, database access, and business rules:

- `auth/` — sessions, password hashing, account actions
- `groups/` — CRUD, roles/permissions, invites, guest members
- `expenses/` — expense creation across all five split methods
- `split/` — the pure split-calculation engine (equal/exact/percentage/shares/itemized), unit tested
- `ledger/` — append-only balance ledger; the single source of truth for "who owes whom"
- `settlement/` — debt-simplification algorithm (minimizes transfer count) + settle-up actions, unit tested
- `payments/` — the **Payment Provider abstraction** and `MockPaymentProvider` (see below)
- `payment-requests/` / `shared-payments/` — the two money-request flows, each with its own state machine
- `notifications/` — in-app notifications + channel-provider abstraction (SMS/WhatsApp/Email, all mocked today)
- `reminders/` — lazy automatic overdue-reminder pass
- `storage/` — file storage abstraction + local disk implementation (receipts)
- `analytics/`, `friends/`, `dashboard/`, `admin/` — read-side query modules
- `security/` — in-memory rate limiting

### Money

Every amount is an **integer in the currency's minor unit** (halalas, fils, cents — see `src/lib/currency.ts` for each currency's digit count). Never a float. `src/lib/money.ts` provides `toMinorUnits`/`toDecimalString`/`formatMoney` for conversion and display, and `allocateEqual`/`allocateByWeights` for exact-sum-preserving splits (the largest-remainder method — no halala is ever dropped or duplicated to rounding).

### Ledger

`LedgerEntry` rows are append-only. A member's balance in a group is `SUM(amount)` over their entries — positive means they're owed money, negative means they owe. Corrections (voiding an expense, reversing a settlement) insert offsetting `ADJUSTMENT` rows; history is never mutated or deleted. This is what the debt-simplification and settle-up features read from, and it's what makes an expense's audit trail reconstructable.

### Payment Provider abstraction

Nothing in the app talks to a payment gateway directly — everything goes through the `PaymentProvider` interface in `src/server/payments/types.ts`:

```ts
interface PaymentProvider {
  createPayment(input): Promise<CreatePaymentResult>;
  getPaymentStatus(providerRef): Promise<PaymentStatusResult>;
  refundPayment(input): Promise<RefundResult>;
  createPayout(input): Promise<PayoutResult>;
  getTransaction(providerRef): Promise<TransactionResult>;
  handleWebhook(rawBody, signature): Promise<WebhookEvent>;
}
```

`MockPaymentProvider` (`src/server/payments/mock-provider.ts`) is the only implementation today, selected via `PAYMENT_PROVIDER=mock` in `.env`. It doesn't fake success silently — the public pay/contribute pages route to a simulator UI (`/pay/simulate/[id]`) where the payer explicitly picks Success/Failed/Cancelled/Pending, clearly labeled "محاكاة دفع — لا توجد أموال حقيقية" (mock payment — no real money moves). That choice is turned into a signed webhook payload and run through the *same* `handleWebhook` → `processWebhookEvent` path a real provider's webhook would use (signature verification, per-event idempotency via a unique `(provider, providerEventId)` constraint, then the domain-side effects: ledger entries, status transitions, notifications). See [Adding a real payment provider](#adding-a-real-payment-provider) below.

**Production safety**: if `PAYMENT_PROVIDER` is still `mock` when `NODE_ENV=production`, `assertRealPaymentsAllowed()` blocks payment initiation outright rather than let a simulated charge look like a real one (spec requirement, not a hypothetical — see `src/server/payments/provider.ts`).

**Concurrency safety**: shared-payment contributions use a single atomic conditional `UPDATE ... WHERE "collectedAmount" + $amount <= "targetAmount"` (or `allowOverfunding`) to increment the collected total — see `applySharedPaymentContributionSuccess` in `src/server/payments/service.ts`. Two contributions racing to fill the last few riyals can't both succeed and overfund the campaign; the loser's charge is marked failed instead.

### Split engine

`src/server/split/split-engine.ts` is pure, dependency-free TypeScript — the same module runs both server-side (authoritative) and client-side (for the live split preview in the expense form). The **server never trusts client-computed totals**: the client sends raw inputs (percentages, share counts, exact amounts, item assignments), and the server independently recomputes every owed amount before writing anything. Covered by unit tests for all five split types plus rounding edge cases (`src/server/split/split-engine.test.ts`).

### Debt simplification

`src/server/settlement/debt-simplification.ts` implements a greedy min-cash-flow algorithm: repeatedly match the largest debtor with the largest creditor. It's not always the mathematically optimal minimum transaction count (that's NP-hard in general), but it's a deterministic, well-understood approximation that real expense-splitting apps ship. Unit tested against the exact trip scenario from the product spec (`src/server/settlement/debt-simplification.test.ts`).

## Testing

```bash
npm test          # unit tests — money, split engine, debt simplification
npm run test:e2e  # end-to-end — see below
```

`e2e/critical-flows.spec.ts` drives three full flows through a real browser against a real (local) database:

- **Scenario A** — دفعت عنهم: sign up, create a group with guest members, add an 800 SAR expense with an equal split and auto-generated payment requests, open the generated public `/pay` link (simulating a different device with no login), pay it via the mock simulator, and confirm the group balance updates.
- **Scenario B** — الدفع التشاركي: create a shared-payment campaign, contribute five times via the public `/qitta` link, and confirm it reaches 100% and status `FUNDED`.
- **Scenario C** — Group Ledger: record three expenses paid by three different people, confirm the debt-simplification settle-up plan is correct, pay off the transfers that have a real account behind them online, and record the rest as a manual settlement, ending on "تمت التسوية بالكامل ✓".

Playwright launches its own dev server (see `playwright.config.ts`); no separate setup needed beyond a running Postgres.

## Environment variables

See `.env.example` for the full list with inline comments. Nothing in it is a real secret — every default is safe for local development. Notable ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session token hashing — **generate a real one** (`openssl rand -base64 32`) before any real deployment |
| `PAYMENT_PROVIDER` | `mock` today; see below to add a real one |
| `STORAGE_PROVIDER` | `local` today (writes under `./storage/uploads`) |
| `SMS_PROVIDER` / `WHATSAPP_PROVIDER` / `EMAIL_PROVIDER` | All `mock` — log to the console instead of sending anything |
| `ENABLE_DEMO_SEED` | Gate for `npm run db:seed`; the script also independently refuses to run in `NODE_ENV=production` unless this is `true` |

## What's left before a commercial launch

By design — these are the pieces that genuinely need a human decision, real credentials, or legal sign-off, not gaps in the implementation:

1. **Deployment / hosting** — pick a target (Vercel, a VPS, containers), point `DATABASE_URL` and `APP_URL` at production infrastructure, run `db:migrate:deploy`.
2. **English (LTR) content** — the i18n architecture is in place from day one (see `src/i18n/config.ts`): every formatter takes an explicit locale, all layout uses CSS logical properties instead of hardcoded left/right, and `User.locale` already exists in the schema. Adding English is translating strings and flipping `<html dir>` dynamically, not rebuilding screens.
3. **A real Saudi payment gateway** — implement `PaymentProvider` (see below) and set `PAYMENT_PROVIDER` to its name. No other code changes.
4. **Real SMS/WhatsApp/Email providers** — implement `MessageProvider` (`src/server/notifications/providers/types.ts`) for each channel you need beyond in-app notifications.
5. **Legal review** — every legal page (`/legal/*`) carries a visible "needs review before commercial launch" notice in the UI itself; the copy is realistic but not attorney-drafted.
6. **Production-grade rate limiting** — the current limiter (`src/server/security/rate-limit.ts`) is in-memory, correct for one instance, and explicitly documented as needing a shared store (Redis, Upstash) behind the same interface for a multi-instance deployment.

## Adding a real payment provider

1. Implement `PaymentProvider` (`src/server/payments/types.ts`) in a new file, e.g. `src/server/payments/saudi-psp-provider.ts`.
2. Register it in `getPaymentProvider()` (`src/server/payments/provider.ts`).
3. Point the provider's webhook URL at `/api/webhooks/payments/<provider-name>` — the route already exists and calls the same `processWebhookEvent` the mock simulator uses.
4. Set `PAYMENT_PROVIDER=<provider-name>` and `PAYMENT_WEBHOOK_SECRET` in the environment.

No call site outside `src/server/payments/` needs to change.

## Security notes

- Passwords hashed with bcrypt; sessions are opaque random tokens, hashed before storage, delivered via an `httpOnly`, `sameSite=lax` cookie (`secure` in production).
- Every public link (payment requests, shared payments, group invites) uses a cryptographically random token (`crypto.randomBytes`), never a guessable database ID.
- Authorization is enforced server-side on every mutation (`requireUser`/`requireMembership`/role-permission checks in `src/server/groups/permissions.ts`), never only in the UI.
- Payment webhooks are signature-verified and idempotent (duplicate delivery of the same event is a no-op, enforced by a unique DB constraint, not just app-level deduplication).
- File uploads are type/size-validated server-side and served through an access-controlled route, not exposed as static files.
- See [What's left](#whats-left-before-a-commercial-launch) for the one item (rate limiting) that needs upgrading for a multi-instance production deployment.
