# Borrowing Management System

A production-ready web-based borrowing management system built with Next.js, Supabase, and TypeScript. Supports borrower and admin portals, guest borrowing, inventory management, credit scoring, and role-based access control.

## Features

- **Dual portals**: Mobile-first borrower portal + desktop-optimized admin/staff portal
- **Role-based access**: Borrower, Staff, Assistant Admin, Admin with backend-enforced permissions
- **Registration invitations**: Single-use, expiring links for borrower and staff registration
- **Inventory management**: SKU/barcode generation, individual item tracking, photo uploads
- **Borrowing workflow**: Multi-item cart, live camera photo capture, approval flow
- **Guest borrowing**: No account required, full transaction tracking
- **Return system**: Barcode scanning, condition assessment, credit calculation
- **Credit system**: Rolling behavioral scoring (0–1000) with history
- **Dashboards**: Admin analytics with charts, borrower stats
- **Activity logs**: Immutable audit trail
- **Email notifications**: Invitations, approvals, due soon, overdue, returns
- **Secure storage**: Private Supabase buckets for borrower/transaction photos

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js Server Actions & API Routes |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Email | Resend (free tier: 100 emails/day) |
| Hosting | Vercel (free tier compatible) |
| Charts | Recharts |
| Barcodes | JsBarcode |

## Quick Start

### 1. Clone and install

```bash
cd "Borrower system"
npm install
cp .env.example .env.local
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys to `.env.local`
3. Run migrations in **SQL Editor** (in order):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

### 3. Create storage buckets

In Supabase Dashboard → Storage, create:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `inventory-photos` | Yes | Inventory item photos |
| `borrower-photos` | No | Borrower profile photos |
| `transaction-photos` | No | Borrow/return verification photos |

### 4. Create first admin

Run in Supabase SQL Editor:

```sql
INSERT INTO setup_tokens (token, expires_at)
VALUES (encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '24 hours')
RETURNING token;
```

Visit `http://localhost:3000/setup/[token]` to create the admin account.

### 5. Configure email (optional)

Sign up at [resend.com](https://resend.com), verify your domain, and add to `.env.local`:

```env
RESEND_API_KEY=re_your_key
EMAIL_FROM=Borrowing System <noreply@yourdomain.com>
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required variables.

| Variable | Client-safe | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes |
| `RESEND_API_KEY` | **No** | For email |
| `EMAIL_FROM` | **No** | For email |
| `CRON_SECRET` | **No** | For cron job |

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin/staff portal
│   ├── borrower/       # Borrower portal
│   ├── borrow/         # Guest borrowing
│   ├── register/       # Invitation registration
│   ├── login/          # Authentication
│   └── api/            # API routes (cron)
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Navigation, sidebars
│   └── shared/         # Camera, barcode, cart
├── lib/
│   ├── actions/        # Server actions
│   ├── auth/           # Auth helpers
│   ├── services/       # Credit, email, activity log
│   └── supabase/       # Supabase clients
└── types/              # TypeScript types
supabase/
└── migrations/         # Database migrations
```

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full system access |
| **Assistant Admin** | Inventory view, request approval, returns |
| **Staff** | Request approval, returns |
| **Borrower** | Browse, borrow, view history, profile |

## Deployment to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add all environment variables
4. Deploy

The `vercel.json` configures a daily cron job at 8 AM UTC for overdue detection and email notifications.

Set `CRON_SECRET` and configure Vercel Cron to send `Authorization: Bearer [CRON_SECRET]` header.

## Testing

```bash
npm test
```

Tests cover: credit calculation, role permissions, invitation logic, inventory quantity rules, SKU validation.

## Security

- Row Level Security (RLS) on all tables
- Server-side authorization on all actions
- Role escalation prevention via database trigger
- Private storage buckets with signed URLs
- Single-use invitation tokens with expiration
- No passwords stored in application database
- Input validation on all server actions

## Branding

Primary: Blue `#1565C0` | Accent: Yellow `#FBC02D` | Background: White

## License

Private — All rights reserved.
