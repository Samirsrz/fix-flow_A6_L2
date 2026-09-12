
# FixFlow — Community Maintenance & Issue Resolution Platform

FixFlow is a backend-only REST API for managing maintenance issues in a residential community. Residents report problems (elevator, water, electricity, garbage, security, etc.), a Manager reviews and assigns a Maintenance Worker, the Worker resolves the issue and logs proof of work, and the Resident confirms or disputes the fix. The platform also handles monthly maintenance-fee billing and payment collection via Stripe.

This is a follow-up project to two earlier assignments (a rental marketplace and a healthcare management system) built with the same stack, and deliberately reuses several proven patterns from those — OTP-based registration held in Redis, role-specific profile tables kept 1:1 with a single identity table, and a strict ownership-check pattern on every scoped resource.

---

## Tech Stack

- **Runtime / Language:** Node.js, TypeScript
- **Framework:** Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Caching / Ephemeral storage:** Redis (OTP codes, pending registrations, resend cooldowns)
- **File uploads:** Multer (memory storage) + Cloudinary
- **Email:** Nodemailer + EJS templates
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Auth:** JWT (access + refresh tokens), bcrypt for password hashing, Google OAuth (GCP Social Login) via `google-auth-library`

---

## Roles & Permissions

| Role | Can do |
|---|---|
| **RESIDENT** | Register (email/password OTP-verified, or Google login), report issues with photos, view/track own issues, chat with the assigned worker, confirm or dispute a resolution and leave feedback, view and pay own maintenance invoices |
| **MANAGER** | View all issues in their own community, review and assign workers with a priority level, monitor progress, view their community's dashboard stats, generate maintenance invoices for their community |
| **WORKER** | View jobs assigned to them, start and progress a job, upload before/after proof photos with notes, mark a job as awaiting confirmation |
| **ADMIN** | Manage communities and categories, manage all user accounts (create Manager/Worker/Admin accounts, change status, ban/soft-delete), resolve escalated disputes, view platform-wide dashboard stats and the full audit log |

---

## Core Workflow

```
REPORTED → (Manager approves + assigns) → ASSIGNED → (Worker starts) → IN_PROGRESS
    → (Worker marks done) → PENDING_CONFIRMATION
        → (Resident confirms + rates) → CLOSED
        → (Resident disputes) → DISPUTED → (Manager/Admin reassigns) → ASSIGNED (cycle repeats)
   (Manager can also reject a REPORTED issue → REJECTED)
```

Every status-changing action is recorded in an audit log, viewable by Admin.

---

## Key Design Decisions

- **Public registration only ever creates RESIDENT accounts** — Manager, Worker, and Admin accounts are created directly by an Admin.
- **Google login is supported alongside email/password**, but the two are kept strictly separate — an account registered one way cannot log in the other way. A brand-new Google sign-in creates only the base account; the Resident then completes their profile (selects their community) in a second step, since Google has no concept of "community."
- **Registration never touches the database until OTP verification succeeds** — the signup payload and OTP both live in Redis with a short TTL, avoiding abandoned unverified rows in Postgres.
- **Soft delete only** — no user is ever hard-deleted, since issues, invoices, and messages all reference back to them for history. `isDeleted` + `deletedAt` mark an account as gone without breaking referential history.
- **Every ownership check is derived server-side from the caller's own profile row**, never trusted from a request body or query param — a Manager's community, a Resident's own issues, a Worker's assigned jobs are always looked up fresh from their JWT-verified identity.
- **Invoices support both a full monthly batch run (all residents in a community at once, skipping anyone already billed for that period) and single-resident generation** for catch-up cases like a new move-in.
- **Payments use a Stripe webhook, not a redirect-confirm flow** — the invoice amount is built inline at checkout time (`price_data`) since amounts vary per invoice, and the webhook is the sole source of truth for marking a payment complete, since it doesn't depend on a resident's browser successfully returning to the app.

---

## Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- PostgreSQL database (local or hosted)
- Redis instance (local or hosted)
- A Cloudinary account (for image uploads)
- A Stripe account in test mode
- A Google Cloud OAuth Client ID (for Google login)
- An SMTP-capable email account (for OTP/notification emails)

### 1. Clone and install dependencies
```bash
git clone <your-repo-url>
cd fixflow-backend
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root with the following:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

BCRYPT_SALT_ROUNDS=10
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

GOOGLE_CLIENT_ID=<your-google-oauth-client-id>

SUPER_ADMIN_EMAIL=<demo-admin-email>
SUPER_ADMIN_NAME=<demo-admin-name>
SUPER_ADMIN_PASSWORD=<demo-admin-password>

REDIS_HOST=<your-redis-host>
REDIS_PORT=<your-redis-port>
REDIS_USER=<your-redis-user>
REDIS_PASSWORD=<your-redis-password>

SMTP_USER=<your-smtp-email>
SMTP_PASSWORD=<your-smtp-app-password>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-signing-secret>
```

### 3. Set up the database
```bash
npx prisma generate
npx prisma migrate dev
```
This will create all tables (User, Resident, Manager, Worker, Community, Category, Issue, WorkerUpdate, Message, Feedback, Invoice, Payment, AuditLog) and their relationships.

### 4. Seed a Super Admin account
The very first Admin has to be seeded directly, since Admin accounts can otherwise only be created by an existing Admin.
```bash
npm run seed
```
(Or trigger `seedSuperAdmin()` however your `package.json` script is wired — it runs once, checks if an Admin already exists, and creates one from the `SUPER_ADMIN_*` env values if not.)

### 5. Run the server
```bash
npm run dev
```
The API will be available at `http://localhost:5000/api/v1`.

### 6. Set up Stripe webhook forwarding (for local payment testing)
Payments rely on a Stripe webhook to confirm a payment succeeded. To test this locally, install the [Stripe CLI](https://docs.stripe.com/stripe-cli), log in with `stripe login` (using the **same Stripe account** your `STRIPE_SECRET_KEY` belongs to), then run, in a separate terminal:
```bash
stripe listen --forward-to localhost:5000/api/v1/payment/webhook
```
Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` in your `.env`, and keep this terminal running whenever you're testing payments.

---

## API Overview

All endpoints are prefixed with `/api/v1`. Full request/response details are available in the Postman collection.

| Module | Base path | Notes |
|---|---|---|
| Auth | `/auth` | Register, OTP verify/resend, login, Google login, complete-profile, refresh/logout, forgot/reset password |
| Profile | `/users` | Get/update own profile |
| Communities | `/community` | Admin creates, Admin/Manager list and view |
| Categories | `/categories` | Admin creates, any authenticated user can list |
| Admin | `/admin` | Create Manager/Worker/Admin accounts, list/ban/delete users, dashboard stats, audit logs |
| Issues | `/issue` | Full lifecycle: report, list (role-scoped), view, change status, log worker progress, resolve/dispute, view feedback |
| Chat | `/issue/messages` | Per-issue messaging between Resident and assigned Worker |
| Invoices | `/invoice` | Manager generates (batch or single), all roles view scoped to themselves |
| Payments | `/payment` | Resident initiates a Stripe Checkout session, Stripe webhook confirms, view a payment's detail |

All responses follow a consistent envelope:
```json
{ "success": true, "statusCode": 200, "message": "...", "data": {} }
```

---

## Authentication

Send the JWT access token on every protected route as:
```
Authorization: Bearer <accessToken>
```
Tokens are issued on login (email/password or Google) and refreshed via the refresh-token endpoint. Each role's access to a given endpoint is enforced both at the route level and, for scoped resources, re-verified inside the service layer against the caller's own profile record.

---

## Notes on Scope

A few things were deliberately kept out of this pass, either because they were genuinely out of scope or because the added complexity wasn't worth it for the size of this project:
- Paying Workers for completed jobs is not modeled — the app tracks Resident-to-Community dues collection only; Worker compensation is assumed to happen outside the platform.
- A forced password-change flow for Admin-created accounts was considered and intentionally left out.
- Category management is a flat lookup table with no hierarchy.
