# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run build        # Production build (Turbopack)
npm run start        # Run production server
npm run lint         # ESLint (flat config, next/core-web-vitals)
```

No test framework is configured. No Prettier — formatting is ESLint-only.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19, Supabase (PostgreSQL + Auth + Storage), SendGrid, Stripe, OpenAI, Puppeteer (PDF generation). Deployed at getclaimflow.com.

**Domain:** ClaimFlow is an Australian R&D Tax Incentive (RDTI) evidence-tracking and claim-pack generation tool. Users collect evidence of R&D activities, link it to core/supporting activities, and generate compliance-ready claim packs. There are three user roles: project owners, consultants (RDTI advisors managing multiple clients), and team members.

### Import aliases

`@/*` maps to project root (`jsconfig.json`). All imports use this prefix.

### Styling

Inline React styles throughout — no CSS framework except `globals.css` and `landing.module.css` for the landing page. Brand color: `#021048` (dark navy). Tailwind CSS 4 is installed but only used minimally.

### Auth flow

Passwordless (magic link/OTP) via Supabase Auth. No middleware — auth is checked at two levels:
- **Client:** `AuthProvider.jsx` wraps the app in `layout.js`, exposes `user`, `subscription`, `isConsultant`, `consultantProfile` via React context
- **Server (API routes):** `lib/serverAuth.js` provides `getAuthenticatedUser(req)` (extracts Bearer token), `verifyProjectAccess(token, userId?)`, `verifyUserAndProjectAccess(req, token)`, and `isConsultantForOwner(consultantId, ownerId)`

### Database

Supabase PostgreSQL with RLS policies. No ORM — all queries use `supabaseAdmin` (service role, server-only from `lib/supabaseAdmin.js`) or `supabaseClient` (anon key, client-side from `lib/supabaseClient.js`). Schema is defined by ~31 sequential migrations in `supabase/migrations/`.

### Project identification

Projects are identified by `project_token` (URL-safe string) in URLs. Access is granted if the user's email is in the project's `participants` array OR the user is `owner_id` (note: `verifyProjectAccess` only checks `participants`, not `owner_id` directly — owners are expected to be in their own participants array). Consultants get access via `consultant_clients` table linkage.

### Page pattern

Pages are thin `'use client'` wrappers that import `<Header />` (or `<AppHeader />`) and a feature component. The feature component holds all logic. API routes live alongside pages under `app/api/`.

### API route pattern

All API routes use `getAuthenticatedUser(req)` for auth, returning `{ user, error }`. Errors return `NextResponse.json({ error }, { status })`. The admin Supabase client is used for all DB operations in API routes (bypasses RLS since auth is done at the route level).

### AI features

OpenAI GPT-4o powers: claim pack narrative generation (`lib/claimPackGenerator.js`), evidence auto-linking, activity classification, and section strengthening. Master context/prompts live in `lib/claimFlowMasterContext.js`.

### Key integrations

- **GitHub:** OAuth + commit syncing (`lib/githubSync.js`, `lib/githubMatching.js`) — commits are matched to R&D activities
- **Jira:** OAuth + ticket syncing (`lib/jiraSync.js`, `lib/jiraMatching.js`)
- **SendGrid:** Outbound emails + inbound email processing via webhook at `/api/inbound/sendgrid`
- **Stripe:** Subscription billing, webhook at `/api/stripe/`

### Financial calculations

Cost capture uses an AI conversational interview (`CostInterviewPanel` → `/api/projects/[token]/costs/ai-interview`). Calculator libraries: `lib/onCostCalculator.js` (super/SGC, payroll tax by state, workers comp, leave), `lib/taxBenefitCalculator.js` (refundable vs non-refundable offsets), `lib/financialsCompute.js` (derived calculations), `lib/smartApportionment.js`.

### Seed scripts

`scripts/seed-demo.mjs`, `scripts/seed-buildflow.mjs`, `scripts/seed-carelink-demo.mjs` — run with `node scripts/seed-demo.mjs` to populate demo data. Requires `.env.local` credentials.

## Gotchas

- `claim-pack-sections` API route uses inline access checks instead of shared `verifyProjectAccess` — must be updated separately when the access model changes
- `verifyProjectAccess` doesn't check `owner_id` — it only checks `participants.includes(email)`. Owners must be in their own participants array.
- Next.js 16 dynamic route params are async — must `await params` before use (e.g., `const { token } = await params`)
- No middleware.js exists — don't create one; auth is handled per-route
- The `config` export deprecation warning in the payroll upload route is pre-existing and expected
