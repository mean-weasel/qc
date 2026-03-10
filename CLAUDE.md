# CLAUDE.md

Project reference for Claude Code. Read this file first before making any changes.

## Project Overview

QC (Quality Couple) -- a relationship wellness app for couples to check in, track growth, and strengthen their connection. Built on Next.js with Supabase auth, real-time sync, and Resend email. Deployed on Vercel with environment variables managed via Vercel.

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js 16 (App Router, Turbopack)   |
| Language   | TypeScript 5.9 (strict mode)         |
| Auth       | Supabase Auth (SSR cookies)          |
| Database   | Supabase (Postgres + RLS)            |
| Email      | Resend + React Email                 |
| State      | React Context                        |
| Realtime   | Supabase Realtime (postgres_changes) |
| Animations | Framer Motion                        |
| UI         | Radix UI + shadcn/ui                 |
| Styling    | Tailwind CSS 4                       |
| Testing    | Vitest + Playwright                  |
| Linting    | ESLint 9 + Prettier 3                |
| Dead Code  | Knip                                 |
| CI         | GitHub Actions                       |
| Deployment | Vercel (auto-deploy on push)         |
| Secrets    | Vercel Environment Variables         |
| Mobile     | Capacitor (iOS)                      |

## Directory Structure

```
src/
  app/
    (auth)/              # Login, signup pages
    (app)/               # Protected app routes (requires auth + couple)
      checkin/           # Check-in session page
      dashboard/         # Dashboard hub with stats + quick actions
      growth/            # Milestones timeline + photo gallery
      love-languages/    # Love language profiles + actions
      notes/             # Shared/private notes
      reminders/         # Reminder management
      requests/          # Partner request inbox
      settings/          # Profile, couple, session settings
    onboarding/          # Post-signup couple creation + partner invite
    invite/[token]/      # Partner invite acceptance
    api/
      health/            # Health check endpoint
      cron/send-reminders/ # Reminder email cron (Vercel cron)
      email/webhook/     # Resend webhook handler
    auth/callback/       # OAuth callback handler
    globals.css          # Tailwind + QC pink/coral theme
    layout.tsx           # Root layout
    providers.tsx        # Client providers (Theme, CheckIn, Bookends, etc.)
    page.tsx             # Landing page (Hero + FeatureGrid)
  components/
    bookends/            # Pre/post check-in modals (preparation, reflection)
    checkin/             # Check-in session components (steps, timer, celebration)
    dashboard/           # Dashboard widgets (quick actions, stats, activity)
    growth/              # Milestone cards, timeline, photo gallery/upload
    Landing/             # Landing page hero + feature grid
    layout/              # App shell (header, navigation, sidebar, footer)
    love-languages/      # Love language cards, dialogs, action lists
    notes/               # Note editor, tags, cards, bulk actions
    reminders/           # Reminder list + chat UI
    requests/            # Request inbox + cards
    settings/            # Settings panels (profile, notifications, session)
    ui/                  # Base UI primitives (Radix wrappers, motion, mobile)
  contexts/              # React Context providers
    CheckInContext.tsx    # Check-in session state (Supabase-backed)
    BookendsContext.tsx   # Pre/post check-in state
    SessionSettingsContext.tsx  # Session config (duration, turns, timeouts)
    LoveLanguagesContext.tsx    # Love languages + actions state
    ThemeContext.tsx      # Light/dark/system theme
  hooks/
    useRealtimeCouple.ts # Supabase Realtime subscription by couple_id
    useMilestones.ts     # Milestone CRUD + photo upload
    useNoteEditor.ts     # Rich text note editing
  lib/
    auth.ts              # requireAuth(), getUserOrNull()
    couples.ts           # Couple CRUD, invite logic, partner lookup
    email/               # Resend client, send helpers, templates
    supabase/            # Supabase client trio + middleware
    utils.ts             # cn(), case transforms
    validation.ts        # Zod schemas, validate() helper
    animations.ts        # Framer Motion variants + spring configs
    text-formatting.ts   # Markdown parsing, sanitization
    haptics.ts           # Capacitor haptic feedback patterns
  middleware.ts          # Auth session refresh, onboarding redirect
  test/                  # Test setup and mocks
  types/
    index.ts             # QC domain types + type unions
    database.ts          # Supabase row types (Db* interfaces)
    checkin.ts           # Check-in session state types
    bookends.ts          # Bookend flow types
supabase/
  migrations/            # 8 SQL migration files (append-only)
  config.toml            # Local Supabase config
  seed.sql               # Local dev seed data
```

## Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)

# Quality
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format with Prettier
npm run format:check     # Check formatting
npm run typecheck        # TypeScript type check
npm run knip             # Detect dead code
npm run check            # All quality checks (lint + typecheck + format:check + test)

# Testing
npm run test             # Vitest run (single pass)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI

# Build
npm run build            # Production build
npm run start            # Start production server

# Database (via Makefile)
make supabase-start      # Start local Supabase
make supabase-stop       # Stop local Supabase
make db-reset            # Reset DB (migrations + seed)
make db-migrate          # Run pending migrations
make db-new name=X       # Create new migration file
make db-push             # Push migrations to local Supabase
make db-pull             # Pull remote schema as migration
```

## Architecture

### Supabase Client Trio

Three Supabase clients for different contexts -- never mix them:

| Client              | File                     | Context                   | Auth         |
| ------------------- | ------------------------ | ------------------------- | ------------ |
| `createClient`      | `lib/supabase/server.ts` | Server components/actions | Cookie       |
| `createClient`      | `lib/supabase/client.ts` | Client components         | Cookie       |
| `createAdminClient` | `lib/supabase/admin.ts`  | Cron jobs, admin tasks    | Service role |

### Auth Flow

1. Middleware (`src/middleware.ts`) refreshes session on every request
2. Public routes: `/`, `/login`, `/signup`, `/auth/callback`, `/api/health`, `/onboarding`, `/invite`, cron
3. Protected routes redirect to `/login?redirect=<original_path>` when unauthenticated
4. Authenticated users without a `couple_id` are redirected to `/onboarding`
5. After onboarding: couple is created, partner invite sent via email
6. `requireAuth()` returns `{ user, supabase }` -- use in server components/actions
7. `getUserOrNull()` returns `User | null` -- use for conditional rendering

### Middleware Pattern

- Refreshes Supabase auth cookies on every request
- Protects all routes except explicit public routes
- Redirects users without couples to `/onboarding` (guards `(app)` routes)
- Adds security headers (X-Frame-Options, CSP, Referrer-Policy)
- Runs before every route via Next.js matcher

### Couple-Scoped Data

All QC data is scoped to a couple, not a user:

- Every data table has a `couple_id` column
- RLS policies use `couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())`
- Both partners in a couple see the same data (except private notes/love languages)
- `lib/couples.ts` provides `getCouple()`, `getPartner()`, `joinCouple()`, `createInvite()`, etc.

### Real-time Sync

Partner sync uses Supabase Realtime via the `useRealtimeCouple` hook:

- Subscribes to `postgres_changes` filtered by `couple_id`
- Tables with realtime enabled: `notes`, `check_ins`, `action_items`, `requests`, `love_actions`
- Callbacks: `onInsert`, `onUpdate`, `onDelete` fire when partner modifies data
- Uses refs for callbacks to avoid re-subscribing on every render

### Server/Client Boundary

- Server Components by default -- add `'use client'` only when needed
- `'use client'` only for hooks, event handlers, browser APIs
- Server actions validate inputs with Zod before any mutation
- Never pass sensitive data (service keys, tokens) as component props

## Conventions

### Code Style

- **No semicolons** -- enforced by Prettier
- **Single quotes** -- enforced by Prettier
- **Trailing commas** -- enforced by Prettier (`trailingComma: 'all'`)
- **120 character line width** -- enforced by Prettier
- **2 space indentation** -- enforced by Prettier/EditorConfig
- **Prefer `function` keyword** over arrow functions for top-level declarations
- **Explicit return types** on exported functions
- **No nested ternaries** -- use if/else or switch

### File Rules

- Max 300 lines per file -- split if larger
- Colocate tests next to source: `auth.ts` -> `auth.test.ts`
- Use `@/` path alias for all imports (configured in tsconfig)
- Import order: external packages, then `@/` imports, separated by blank line

### Naming

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case`

### TypeScript

- Strict mode enabled -- no `any` types
- Use `unknown` with type guards instead of `any`
- Zod for runtime validation of external data (API inputs, form data)
- Explicit `Props` type for every React component

## Database

### Migration Workflow

1. Create migration: `make db-new name=add_projects`
2. Write SQL in the generated file (include RLS policies)
3. Apply locally: `make db-push`
4. Test locally, then commit the migration file
5. Migrations run automatically on Vercel deploy

### RLS Patterns

Every table in `public` schema MUST have RLS enabled. QC tables use **couple-scoped** policies:

- SELECT: `USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))`
- INSERT: `WITH CHECK (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))`
- UPDATE: same USING + WITH CHECK as above
- DELETE: same USING as SELECT

Privacy-filtered tables (`notes`, `love_languages`) add `AND (privacy = 'shared' OR user_id = auth.uid())` to SELECT.

Trigger functions use `SECURITY DEFINER SET search_path = ''` for safety.

### Tables (11 total, 8 migrations)

| Table              | Scope       | Migration | Description                              |
| ------------------ | ----------- | --------- | ---------------------------------------- |
| `profiles`         | user        | 00001     | Auto-created on signup, has `couple_id`  |
| `couples`          | couple      | 00003     | Couple entity + settings JSONB           |
| `couple_invites`   | couple      | 00003     | Partner invite tokens (pending/accepted) |
| `check_ins`        | couple      | 00004     | Check-in sessions with mood tracking     |
| `notes`            | couple+user | 00004     | Private/shared notes with tags           |
| `action_items`     | couple      | 00004     | To-dos from check-in sessions            |
| `milestones`       | couple      | 00005     | Growth achievements + photo URLs         |
| `reminders`        | couple      | 00006     | Scheduled reminders (email/in-app)       |
| `requests`         | couple      | 00006     | Partner-to-partner requests              |
| `love_languages`   | couple+user | 00007     | Love language profiles (private/shared)  |
| `love_actions`     | couple      | 00007     | Actions linked to love languages         |
| `session_settings` | couple      | 00008     | Check-in session config (1:1 per couple) |

Storage bucket: `milestone-photos` (public read, authenticated upload)

## Claude Code Features

### Hooks (`.claude/settings.json`)

- **PreToolUse (protect-files)**: blocks edits to `.env` files, `package-lock.json`, and existing migration files
- **PostToolUse (auto-format)**: runs ESLint fix + Prettier on every file after edit/write

### Skills (`.claude/skills/`)

**Project-specific:**

| Skill          | Description                                              |
| -------------- | -------------------------------------------------------- |
| `scaffold-api` | Generate API route with auth, validation, error handling |
| `db-migrate`   | Create and apply a Supabase migration                    |
| `gen-test`     | Generate Vitest unit tests for a source file             |
| `audit-rls`    | Audit all tables for RLS policies                        |
| `monitor-ci`   | Check GitHub Actions CI status and diagnose failures     |
| `ship`         | Run quality pipeline and create PR or deploy             |

**Development workflow:**

| Skill                     | Description                                                    |
| ------------------------- | -------------------------------------------------------------- |
| `feature-dev`             | Guided 7-phase feature development with codebase exploration   |
| `code-review`             | Multi-angle PR code review with confidence scoring             |
| `systematic-debugging`    | 4-phase root cause investigation before proposing fixes        |
| `test-driven-development` | Red-Green-Refactor TDD cycle                                   |
| `pr-creator`              | Create PR, monitor CI, fix failures until green                |
| `validator`               | Auto-detect project and run lint, typecheck, tests, knip       |
| `brainstorming`           | Explore intent, requirements, and design before implementation |
| `bug-interview`           | Deep bug triage interview to isolate root cause                |
| `feature-interview`       | Deep feature discovery interview before implementation         |

### Agents (`.claude/agents/`)

| Agent               | Description                                     |
| ------------------- | ----------------------------------------------- |
| `code-reviewer`     | Review changes for quality, auth, RLS, patterns |
| `security-reviewer` | Audit for RLS, auth bypass, key exposure, XSS   |
| `test-writer`       | Generate Vitest + Playwright tests              |

### MCP Servers (`.mcp.json`)

- **supabase**: Supabase MCP server for database queries
- **context7**: Context7 MCP server for documentation lookups

## Deployment

### Vercel

- Auto-deploys on push to `main`
- Preview deploys on pull requests
- Build command: `next build`
- Environment variables managed via Vercel

### Environment Variables

All secrets live in Vercel Environment Variables. See `.env.example` for the full list:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- public Supabase config
- `SUPABASE_SERVICE_ROLE_KEY` -- server-only admin access
- `RESEND_API_KEY` -- email service
- `CRON_SECRET` -- authenticates Vercel cron requests

## Testing

### Unit Tests (Vitest)

- Config: `vitest.config.ts` with `vitest.setup.ts`
- Mock Supabase via `src/test/mocks/supabase.ts`
- Mock Next.js navigation/headers via `src/test/setup.ts`
- AAA pattern: Arrange, Act, Assert
- Reset mocks in `beforeEach`

### E2E Tests (Playwright)

- Config: `playwright.config.ts`
- Tests live in `e2e/` directory
- CI runs with sharded Playwright (2 shards)
- Uses local Supabase instance in CI

### CI Pipeline (GitHub Actions)

Runs on push to `main` and pull requests:

1. **lint-and-typecheck**: ESLint + `tsc --noEmit`
2. **unit-tests**: Vitest with coverage
3. **e2e-tests**: Playwright with local Supabase (after lint + unit pass)
4. **knip**: Dead code detection

## Guardrails

- **Retry limit**: max 3 attempts on any failing operation before stopping
- **Never edit existing migrations**: create a new migration instead (enforced by hook)
- **Never expose service role key**: only use in `lib/supabase/admin.ts` and cron
- **Never commit `.env` files**: use Vercel env vars (enforced by hook)
- **Never use `any`**: use `unknown` with type guards
- **Never skip auth checks**: every API route and server action starts with `requireAuth()`
- **Always enable RLS**: every new table must have RLS enabled with couple-scoped policies
- **Always validate inputs**: use Zod schemas for API inputs and form data
- **Always scope queries by couple_id**: never query data without filtering by the user's couple
- **Respect privacy flags**: notes and love languages with `privacy = 'private'` are only visible to the author
- **Use `useRealtimeCouple`** for tables that need partner sync (don't create raw Supabase channel subscriptions)
