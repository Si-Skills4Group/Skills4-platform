# Skills4CRM

An internal employer engagement CRM built as a **lightweight MVP** to validate workflow and UX before a full **production deployment to Microsoft Azure**.

> **Handoff note for cloud architects and Azure engineers:** This document is structured as an Azure deployment reference. Every layer — API hosting, frontend hosting, database, identity, secrets, monitoring, container registry — has a documented Azure target. See the [Azure deployment readiness](#azure-deployment-readiness) section.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Quick start (Replit)](#quick-start-replit)
5. [Local setup outside Replit](#local-setup-outside-replit)
6. [Environment variables](#environment-variables)
7. [Database migrations workflow](#database-migrations-workflow)
8. [Docker](#docker)
9. [Azure deployment readiness](#azure-deployment-readiness)
   - [Service mapping](#service-mapping)
   - [Reference architecture](#reference-architecture)
   - [Azure deployment steps (suggested order)](#azure-deployment-steps-suggested-order)
   - [Database hosting on Azure](#database-hosting-on-azure)
   - [Audit log](#audit-log)
10. [Demo accounts](#demo-accounts)
11. [Authentication & RBAC](#authentication--rbac)
12. [Database schema](#database-schema)
13. [API routes](#api-routes)
14. [Automations (business logic inventory)](#automations-business-logic-inventory)
15. [Roadmap](#roadmap)

---

## What it does

Skills4CRM helps employer engagement teams manage relationships with organisations, contacts, and apprenticeship opportunities in one place. It covers the full pipeline from initial SDR prospecting through to active employer partnership.

| Module | Description |
|---|---|
| **Dashboard** | Pipeline summary, overdue tasks, stage breakdown charts, upcoming next actions |
| **Organisations** | Employer, training provider, and partner accounts with full CRUD and linked records |
| **Contacts** | People within organisations, linked to engagements and tasks |
| **Engagements** | Apprenticeship/placement opportunities tracked through a 7-stage pipeline (Lead → Won) |
| **Tasks** | Internal actions with priority, status, due dates, overdue highlighting, and completion |
| **SDR Pipeline** | Call-led prospecting dashboard: daily call metrics, pipeline breakdown chart, conversion funnel, and recent activity feed |
| **Call Queue** | SDR prospect list with call outcome tracking, next call scheduling, stage progression, and one-click call logging via a side drawer |
| **SDR Performance** | Manager-level report: rep performance table, meetings booked by week, terminal stage breakdown, and overdue follow-up list |

---

## Tech stack

| Layer | Technology | Azure target |
|---|---|---|
| Frontend | React 18, Vite, TailwindCSS, Wouter, React Query | **Azure Static Web Apps** (or App Service for Static) |
| Backend | Express 5, Node.js 24 | **Azure App Service** (Linux) or **App Service for Containers** |
| Database | PostgreSQL, Drizzle ORM | **Azure Database for PostgreSQL — Flexible Server** |
| API spec | OpenAPI 3.0, Orval codegen | Bundled with the API — no separate Azure service |
| Auth | JWT (`bcryptjs` + `jsonwebtoken`) — Entra ID ready | **Microsoft Entra ID** (via `passport-azure-ad`) |
| Secrets | env vars (Replit Secrets / `.env`) | **Azure Key Vault** referenced from App Service settings |
| Logging | pino (structured JSON) | stdout → App Service log streams → **Application Insights** |
| Container registry | n/a (built locally) | **Azure Container Registry** |
| Monorepo | pnpm workspaces, TypeScript | n/a (build-time concern) |

---

## Project structure

```
.
├── artifacts/
│   ├── api-server/              # Express 5 REST API
│   │   └── src/
│   │       ├── routes/          # One file per resource
│   │       │   ├── engagements.ts   # CRUD + log-call + handover + SDR automations
│   │       │   ├── dashboard.ts     # Summary, SDR pipeline, and SDR manager reports
│   │       │   ├── tasks.ts
│   │       │   ├── contacts.ts
│   │       │   ├── organisations.ts
│   │       │   └── activityLog.ts
│   │       ├── middlewares/     # authenticate.ts, requireRole.ts
│   │       └── lib/
│   │           ├── config.ts        # Centralised, validated, frozen env config
│   │           ├── auth.ts          # JWT helpers (swap for Entra ID here)
│   │           ├── logger.ts        # pino instance
│   │           └── logActivity.ts   # Audit log writer
│   └── crm/                     # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── Dashboard.tsx        # Main CRM dashboard
│           │   ├── SdrDashboard.tsx     # SDR Pipeline dashboard
│           │   ├── SdrQueue.tsx         # Call Queue (prospect table + filters)
│           │   ├── SdrReport.tsx        # SDR Performance Report
│           │   ├── Engagements.tsx
│           │   ├── EngagementDetail.tsx
│           │   ├── Organisations.tsx
│           │   ├── OrganisationDetail.tsx
│           │   ├── Contacts.tsx
│           │   ├── ContactDetail.tsx
│           │   └── Tasks.tsx
│           ├── components/
│           │   ├── sdr/
│           │   │   ├── ProspectDrawer.tsx    # Side drawer: call log, stage actions, history
│           │   │   ├── FilterPanel.tsx       # Call Queue filter sidebar
│           │   │   ├── FunnelBar.tsx         # Inline funnel bar component
│           │   │   └── constants.ts          # Stages, outcomes, colours, sort options
│           │   └── layout/
│           │       └── AppLayout.tsx         # Nav: SDR Pipeline / Call Queue / SDR Performance
│           └── contexts/        # AuthContext
├── lib/
│   ├── api-spec/                # OpenAPI 3.0 spec + Orval config
│   ├── api-client-react/        # Generated React Query hooks (do not edit)
│   ├── api-zod/                 # Generated Zod schemas (do not edit)
│   └── db/
│       ├── src/
│       │   ├── schema/          # Drizzle ORM table definitions
│       │   ├── index.ts         # Pool + drizzle instance export
│       │   └── migrate.ts       # Standalone migration runner
│       ├── migrations/          # Versioned SQL migrations (drizzle-kit generate)
│       └── drizzle.config.ts
├── scripts/
│   └── src/seed.ts              # Demo data (12 orgs, 20 contacts, 15 engagements, 15 SDR prospects, 21 tasks)
├── Dockerfile                   # Multi-stage build for the API server
├── .dockerignore
└── pnpm-workspace.yaml
```

---

## Quick start (Replit)

Inside the Replit workspace, the workflows boot everything for you:

```bash
# Install dependencies
pnpm install

# Push database schema (development)
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed
```

The three preconfigured workflows (`API Server`, `web`, `Component Preview Server`) start automatically.

After modifying the OpenAPI spec, regenerate the client hooks:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Local setup outside Replit

**Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL 14+ (local or Azure Database for PostgreSQL Flexible Server).

```bash
# 1. Clone and install
git clone <repo-url> skills4crm && cd skills4crm
pnpm install

# 2. Configure environment
export DATABASE_URL=postgres://user:pass@localhost:5432/skills4crm
export JWT_SECRET=$(openssl rand -hex 32)
export PORT=8080

# 3. Apply schema (development) OR run versioned migrations (production)
pnpm --filter @workspace/db run push        # dev: drizzle-kit push (idempotent)
# or
pnpm --filter @workspace/db run migrate     # prod: applies lib/db/migrations/*.sql

# 4. Seed demo data (optional, local-dev only)
pnpm --filter @workspace/scripts run seed

# 5. Build and start the API
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start

# 6. (separate terminal) Start the CRM frontend
pnpm --filter @workspace/crm run dev
```

The healthcheck endpoint is `GET /api/healthz` — use it for App Service / load balancer probes.

---

## Environment variables

All env vars are read, validated, and frozen on first import via `artifacts/api-server/src/lib/config.ts`. Other modules MUST import from this file rather than reading `process.env` directly.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` or `production`. In production, `JWT_SECRET` is required and the dev fallback is rejected. |
| `PORT` | yes | — | API server port. App Service injects this automatically. |
| `DATABASE_URL` | yes | — | PostgreSQL connection string. For Azure Database for PostgreSQL, append `?sslmode=require`. |
| `JWT_SECRET` | yes (in production) | dev fallback (development only) | Strong random string for JWT signing. **Store in Azure Key Vault.** |
| `JWT_EXPIRES_IN` | no | `7d` | JWT lifetime (any [vercel/ms](https://github.com/vercel/ms) string). |
| `LOG_LEVEL` | no | `info` | Pino log level: `trace` / `debug` / `info` / `warn` / `error` / `fatal`. |
| `CORS_ORIGIN` | no | `*` | Comma-separated allowed origins, or `*`. **Tighten to your Static Web Apps URL in production.** |

In Azure, set these as App Service application settings, ideally as Key Vault references:

```
@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/JWT-SECRET/)
```

---

## Database migrations workflow

Drizzle generates versioned SQL migration files under `lib/db/migrations/`. A baseline (`0000_*.sql`) representing the full current schema is committed.

```bash
# After editing lib/db/src/schema/*.ts
pnpm --filter @workspace/db run generate    # creates lib/db/migrations/NNNN_*.sql
git add lib/db/migrations
git commit -m "chore(db): migration for <change>"

# Apply pending migrations (production / CI)
pnpm --filter @workspace/db run migrate
```

Local dev can still use `pnpm --filter @workspace/db run push` for fast schema syncs. **Never run `push` against production** — always use the `migrate` script so the change history is auditable.

> **Where to run migrations in Azure:** run `pnpm --filter @workspace/db run migrate` from your **CI/CD pipeline** (Azure DevOps, GitHub Actions) against the production `DATABASE_URL` *before* the new API image is rolled out. The runtime container (`Dockerfile`) is intentionally minimal — it bundles the built API only, not the migrations folder or drizzle-kit. This keeps the production image small and makes the schema change history a deploy-time concern, not a runtime concern.

---

## Docker

A multi-stage `Dockerfile` at the repo root builds the API server:

```bash
docker build -t skills4crm-api .
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e CORS_ORIGIN=https://crm.example.com \
  skills4crm-api
```

The image includes a built-in `HEALTHCHECK` that hits `/api/healthz`, which is picked up automatically by Docker, App Service for Containers, and Kubernetes liveness/readiness probes.

To push to **Azure Container Registry**:

```bash
az acr login --name <registry>
docker tag skills4crm-api <registry>.azurecr.io/skills4crm-api:latest
docker push <registry>.azurecr.io/skills4crm-api:latest
```

---

## Azure deployment readiness

The codebase is structured so every Azure-managed service has a clear seam.

### Service mapping

| Concern | Local / Replit | Azure target |
|---|---|---|
| API hosting | `pnpm --filter @workspace/api-server run dev` | **Azure App Service** (Linux, Node 24) or **App Service for Containers** with the bundled `Dockerfile` |
| Frontend hosting | `pnpm --filter @workspace/crm run dev` (Vite) | **Azure Static Web Apps** (build with `pnpm --filter @workspace/crm run build`, publish `artifacts/crm/dist`) |
| Database | Replit Postgres | **Azure Database for PostgreSQL — Flexible Server** with `sslmode=require` and a private endpoint |
| Authentication | Local JWT (`lib/auth.ts`) | **Microsoft Entra ID** via `passport-azure-ad` `BearerStrategy` — swap the body of `signToken` / `verifyToken` only; the middleware contract is unchanged |
| Secrets | env vars / Replit Secrets | **Azure Key Vault**, surfaced as App Service application settings via `@Microsoft.KeyVault(SecretUri=…)` references |
| Monitoring | pino + stdout | **Application Insights** — install the `applicationinsights` SDK in `index.ts` (`appInsights.setup(...).start()`); pino logs flow through stdout into App Service log streams |
| Container registry | n/a | **Azure Container Registry** |
| Edge / TLS / WAF | Replit-managed proxy | **Azure Front Door** (recommended) or Application Gateway in front of App Service |
| CI/CD | manual | **GitHub Actions** or **Azure DevOps Pipelines** running `pnpm install → migrate → build → deploy` |
| Healthcheck | `GET /api/healthz` | App Service health-check path; same endpoint for Kubernetes probes |
| RBAC | `requireRole` / `requireMinRole` middleware | Same middleware; map Entra ID app roles → `admin` / `crm_manager` / `engagement_user` / `read_only` in the bearer-token callback |

### Reference architecture

```
                ┌─────────────────────────┐
                │   Azure Front Door      │
                │   (TLS, WAF, routing)   │
                └────────────┬────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
   ┌────────▼────────┐               ┌────────▼─────────┐
   │ Azure Static    │               │ Azure App Service│
   │ Web Apps        │   /api/*      │  (Linux / Node 24│
   │ (CRM frontend)  │──────────────▶│   or container)  │
   └─────────────────┘               └────────┬─────────┘
                                              │
                  ┌───────────────────────────┼───────────────────────────┐
                  │                           │                           │
         ┌────────▼────────┐         ┌────────▼─────────┐        ┌────────▼─────────┐
         │ Microsoft       │         │ Azure Database   │        │ Application      │
         │ Entra ID        │         │ for PostgreSQL   │        │ Insights         │
         │ (auth, roles)   │         │ Flexible Server  │        │ (logs, traces)   │
         └─────────────────┘         └──────────────────┘        └──────────────────┘
                                              ▲
                                              │  secrets via
                                     ┌────────┴─────────┐
                                     │  Azure Key Vault │
                                     │  (JWT_SECRET,    │
                                     │   DATABASE_URL)  │
                                     └──────────────────┘
```

### Azure deployment steps (suggested order)

1. **Provision the resource group** — single region, e.g. `uksouth` for UK data residency.
2. **Provision Azure Database for PostgreSQL Flexible Server** — set firewall to allow Azure services + your CI runner; create the `skills4crm` database; capture the connection string.
3. **Provision Azure Key Vault** — store `JWT_SECRET` (generate with `openssl rand -hex 32`), `DATABASE_URL`, and any other secrets.
4. **Provision Azure Container Registry** — for the API image.
5. **Provision Azure App Service** (Linux plan B1 or higher, or App Service for Containers) — point it at the ACR image; configure App Settings as Key Vault references; set health-check path to `/api/healthz`.
6. **Provision Azure Static Web Apps** — connect to the GitHub repo; build path `artifacts/crm`, output `dist`, build command `pnpm --filter @workspace/crm run build`.
7. **Provision Application Insights** — copy the instrumentation key into App Service settings; add the `applicationinsights` SDK to `artifacts/api-server/src/index.ts` (one-line bootstrap).
8. **Provision Azure Front Door** (optional, recommended) — single hostname for both Static Web Apps and the API; enable WAF policies.
9. **Configure CI/CD** — one workflow that runs `pnpm install` → `pnpm --filter @workspace/db run migrate` → `pnpm --filter @workspace/api-server run build` → `docker build && docker push` → `az webapp deploy` → Static Web Apps deploy.
10. **Switch authentication to Entra ID** — register the API as an app registration; configure app roles (`admin`, `crm_manager`, `engagement_user`, `read_only`); install `passport-azure-ad`; replace the body of `signToken` / `verifyToken` in `lib/auth.ts`. The middleware contract on `req.user` does not change.
11. **Cut over** — point DNS at Front Door; decommission the Replit deployment.

### Database hosting on Azure

The schema uses Postgres-native features: `serial` (auto-increment), `jsonb` (activity-log metadata), and standard B-tree indexes. **Recommended:** **Azure Database for PostgreSQL Flexible Server** — preserves the schema verbatim, offers private endpoints, geo-redundant backups, and Entra ID authentication.

If Azure SQL is mandated instead, plan the following changes before migrating:
- `serial` → `INT IDENTITY(1,1)`
- `jsonb` → `NVARCHAR(MAX)` with `ISJSON` constraint
- `text` → `NVARCHAR(MAX)`
- Re-evaluate index strategy (Azure SQL has no GIN/JSONB indexes)
- Switch the Drizzle dialect from `postgresql` → `mssql` (community driver, less mature)

For most teams, **Azure Database for PostgreSQL Flexible Server is the lower-risk, lower-effort choice** and is fully Azure-native.

### Audit log

The `activity_log` table records `(event_type, entity_type, entity_id, actor_user_id, metadata, created_at)` for the following events:

`org_created`, `contact_added`, `engagement_created`, `stage_changed`, `task_created`, `task_completed`, `call_logged`, `qualification_changed`, `handover_initiated`, `handover_completed`, `disqualified`.

All writes go through `lib/logActivity.ts`; failures are swallowed and logged to stderr so audit issues never break the user-facing request. In Azure, these records co-exist with Application Insights traces — the database log is the **business** audit trail; App Insights is the **operational** trace.

---

## Demo accounts

| Email | Password | Role | Permissions |
|---|---|---|---|
| admin@company.com | Admin123! | Admin | Full access + user management |
| manager@company.com | Manager123! | CRM Manager | Full CRUD on all records |
| user@company.com | User123! | Engagement User | Create and edit, no delete |
| readonly@company.com | ReadOnly123! | Read Only | View only |

> Demo accounts are seeded by `pnpm --filter @workspace/scripts run seed`. **Do not seed production** — create real users via the API once Entra ID SSO is wired up.

---

## Authentication & RBAC

### Current: Local JWT

The MVP uses local JWT authentication (`bcryptjs` + `jsonwebtoken`). All the auth logic is isolated to two files:

- `artifacts/api-server/src/lib/auth.ts` — `signToken`, `verifyToken` (reads `JWT_SECRET` from the centralised config layer)
- `artifacts/api-server/src/middlewares/authenticate.ts` — validates the bearer token on every protected route

### Migration path to Microsoft Entra ID

The middleware interface is **unchanged** by the migration:

```
Step 1: Register the API as an app registration in Entra ID; capture tenant ID and client ID
Step 2: Define app roles: admin, crm_manager, engagement_user, read_only
Step 3: pnpm add passport-azure-ad in artifacts/api-server
Step 4: In lib/auth.ts, configure BearerStrategy with tenantId and clientID from config
Step 5: Replace signToken/verifyToken with passport.authenticate('oauth-bearer')
Step 6: authenticate.ts stays the same — it just calls next() with req.user populated
Step 7: Remove password_hash from the users table; map Entra ID OID → user record on first sign-in
Step 8: Map Entra ID app role assignments to the role field
```

### Role hierarchy

| Role | Level | Create | Edit | Delete | User Mgmt |
|---|---|---|---|---|---|
| `admin` | 4 | ✓ | ✓ | ✓ | ✓ |
| `crm_manager` | 3 | ✓ | ✓ | ✓ | — |
| `engagement_user` | 2 | ✓ | ✓ | — | — |
| `read_only` | 1 | — | — | — | — |

Permissions are enforced **server-side** via `requireRole(...allowedRoles)` and `requireMinRole(minRole)` in `artifacts/api-server/src/middlewares/requireRole.ts`. The frontend hides actions cosmetically; the API is the source of truth.

---

## Database schema

All table definitions are in `lib/db/src/schema/`. Each file uses Drizzle ORM with explicit indexes and foreign keys. The full baseline is captured in `lib/db/migrations/0000_*.sql`.

### users

```
users
├── id              serial PK
├── full_name       text NOT NULL
├── email           text UNIQUE
├── role            text                      (admin | crm_manager | engagement_user | read_only)
├── is_active       boolean DEFAULT true
├── password_hash   text                      (LOCAL AUTH ONLY — dropped on Entra ID migration)
├── created_at      timestamp DEFAULT now()
└── updated_at      timestamp DEFAULT now()
```

### organisations

```
organisations
├── id              serial PK
├── name            text NOT NULL
├── type            text                      (employer | training_provider | partner)
├── sector          text NOT NULL
├── region          text
├── status          text                      (prospect | active | dormant | closed)
├── owner_user_id   int FK → users
├── website         text
├── phone           text
├── notes           text
├── created_at      timestamp
└── updated_at      timestamp
```

### contacts

```
contacts
├── id                       serial PK
├── organisation_id          int FK → organisations
├── first_name               text NOT NULL
├── last_name                text NOT NULL
├── job_title                text
├── email                    text
├── phone                    text
├── preferred_contact_method text                   (email | phone | post | no_preference)
├── notes                    text
├── created_at               timestamp
└── updated_at               timestamp
```

### engagements

The `engagements` table serves **two engagement types** via the `engagement_type` discriminator:

- `employer_engagement` — standard 7-stage relationship pipeline (Lead → Won)
- `sdr` — call-led prospecting pipeline with 12 stages and full call-tracking fields

```
engagements (shared fields)
├── id                      serial PK
├── engagement_type         text                  ('employer_engagement' | 'sdr')
├── organisation_id         int FK → organisations
├── primary_contact_id      int FK → contacts
├── owner_user_id           int FK → users
├── title                   text NOT NULL
├── stage                   text                  (employer_engagement pipeline stage)
├── status                  text                  (open | closed_won | closed_lost | on_hold)
├── expected_learner_volume int
├── expected_value          numeric(12,2)
├── probability             int                   (0–100)
├── last_contact_date       text (ISO date)
├── next_action_date        text (ISO date)
├── next_action_note        text
├── notes                   text
├── touch_count             int DEFAULT 0
├── outreach_channel        text
├── last_outreach_date      text (ISO date)
├── created_at              timestamp
└── updated_at              timestamp

engagements (SDR-specific fields — populated when engagement_type = 'sdr')
├── sdr_stage               text
│                             Values: new | researching | attempted_call | contact_made |
│                                     no_contact | follow_up_required | interested |
│                                     meeting_booked | qualified | nurture | unresponsive |
│                                     disqualified | do_not_contact | bad_data | changed_job
├── sdr_owner_user_id       int FK → users
├── handover_owner_user_id  int FK → users
├── handover_status         text                  (pending | complete)
├── handover_notes          text
├── qualification_status    text
├── disqualification_reason text                  (required when sdr_stage = disqualified)
├── call_attempt_count      int DEFAULT 0
├── last_call_date          text (ISO date)
├── last_call_outcome       text
│                             Values: no_answer | voicemail_left | gatekeeper |
│                                     wrong_person | spoke_call_back_later |
│                                     spoke_send_info | spoke_not_interested |
│                                     spoke_interested | meeting_booked
├── next_call_date          text (ISO date)
├── contact_made            boolean DEFAULT false
├── voicemail_left          boolean DEFAULT false
├── follow_up_required      boolean DEFAULT false
├── follow_up_reason        text
├── meeting_booked          boolean DEFAULT false
├── meeting_date            text (ISO date)
├── mql_status              boolean DEFAULT false
├── sql_status              boolean DEFAULT false
├── opportunity_created     boolean DEFAULT false
├── pitch_deck_sent         boolean DEFAULT false
├── info_sent_date          text (ISO date)
└── latest_note             text
```

### tasks

```
tasks
├── id               serial PK
├── organisation_id  int FK → organisations
├── engagement_id    int FK → engagements
├── assigned_user_id int FK → users
├── title            text NOT NULL
├── description      text
├── due_date         text (ISO date)
├── priority         text                       (low | medium | high)
├── status           text                       (open | in_progress | completed | overdue)
├── created_at       timestamp
└── updated_at       timestamp
```

### activity_log

```
activity_log
├── id              serial PK
├── event_type      text
│                     Values: org_created | contact_added | engagement_created |
│                             stage_changed | task_created | task_completed |
│                             call_logged | qualification_changed |
│                             handover_initiated | handover_completed | disqualified
├── entity_type     text                        (organisation | engagement | contact | task)
├── entity_id       int
├── actor_user_id   int FK → users
├── metadata        jsonb                       (per-event context)
└── created_at      timestamp DEFAULT now()
```

Every table has appropriate B-tree indexes on foreign keys, status fields, and date columns used in queries — see each schema file for the full index list.

---

## API routes

All routes require a valid `Authorization: Bearer <token>` header except `GET /api/healthz` and `POST /api/auth/login`.

### Auth

| Method | Path | Role required | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate with email/password. Returns `{ token, user }`. |
| `GET` | `/api/auth/me` | Any | Returns the authenticated user object. |

### Organisations

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/organisations` | Any | List all organisations. Supports `?search=`, `?type=`, `?status=`, `?sector=`, `?region=`. Returns `contactCount` and `engagementCount` per row. |
| `POST` | `/api/organisations` | engagement_user+ | Create an organisation. Logs `org_created`. |
| `GET` | `/api/organisations/:id` | Any | Get a single organisation with linked engagements, contacts, and activity log. |
| `PUT` | `/api/organisations/:id` | engagement_user+ | Update an organisation. |
| `DELETE` | `/api/organisations/:id` | crm_manager+ | Delete an organisation. |

### Contacts

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/contacts` | Any | List contacts. Supports `?search=`, `?organisationId=`. |
| `POST` | `/api/contacts` | engagement_user+ | Create a contact. Logs `contact_added` to both the contact and its parent organisation. |
| `GET` | `/api/contacts/:id` | Any | Get a single contact with linked organisation and activity. |
| `PUT` | `/api/contacts/:id` | engagement_user+ | Update a contact. |
| `DELETE` | `/api/contacts/:id` | crm_manager+ | Delete a contact. |

### Engagements

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/engagements` | Any | List engagements. Supports `?search=`, `?stage=`, `?status=`, `?organisationId=`, `?engagementType=`, `?sdrOwnerUserId=`. Returns `organisationName`, `contactName`, `ownerName`, `sdrOwnerName`. |
| `POST` | `/api/engagements` | engagement_user+ | Create an engagement. If `engagementType=sdr`, automatically sets `sdrStage=new`, assigns `sdrOwnerUserId` to the current user, and creates an "Initial outreach" task. |
| `GET` | `/api/engagements/:id` | Any | Get a single engagement with linked tasks and activity log. |
| `PUT` | `/api/engagements/:id` | engagement_user+ | Update an engagement. Triggers SDR automations for stage transitions (see [Automations](#automations-business-logic-inventory)). |
| `DELETE` | `/api/engagements/:id` | crm_manager+ | Delete an engagement. |
| `POST` | `/api/engagements/:id/log-call` | engagement_user+ | Log a call outcome. Increments `callAttemptCount`, sets `lastCallDate`, `lastCallOutcome`, auto-advances `sdrStage` based on outcome, and sets contact/follow-up flags. |
| `POST` | `/api/engagements/:id/handover` | engagement_user+ | Hand over an SDR prospect to an Account Executive. Sets `sdrStage=qualified`, creates or reuses an `employer_engagement` for the same organisation, optionally creates a follow-up task. |

### Tasks

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Any | List tasks. Supports `?status=`, `?priority=`, `?assignedUserId=`, `?organisationId=`, `?engagementId=`. |
| `POST` | `/api/tasks` | engagement_user+ | Create a task. |
| `GET` | `/api/tasks/:id` | Any | Get a single task. |
| `PUT` | `/api/tasks/:id` | engagement_user+ | Update a task. If `status` changes to `completed`, logs `task_completed` to the task, its engagement, and its organisation. |
| `DELETE` | `/api/tasks/:id` | crm_manager+ | Delete a task. |

### Activity Log

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/activity` | Any | Query the activity log. Requires `?entityType=` and `?entityId=`. Returns entries in reverse chronological order. |

### Dashboard & Reporting

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Any | Main CRM dashboard: KPI counts, `engagementsByStage`, `tasksByStatus`, `organisationsByType`, `myOpenTasks`, `recentOrganisations`, `upcomingNextActions`. |
| `GET` | `/api/dashboard/sdr` | Any | SDR Pipeline dashboard: `callsToday`, `dueFollowUpsToday`, `overdueFollowUps`, `meetingsBookedThisWeek`, `qualifiedLeads`, `newProspects`, `prospectsByStage`, `conversionFunnel`, `myTasks`, `recentProspects`. |
| `GET` | `/api/dashboard/sdr/manager` | Any | SDR Manager report: `repPerformance`, `meetingsByWeek` (8-week trend), `terminalStageDistribution`, `overdueFollowUps`. |
| `GET` | `/api/users` | Any | List active users (for owner/assignee dropdowns). |
| `GET` | `/api/users/:id` | Any | Get a user profile. |
| `PUT` | `/api/users/:id` | Same user or admin | Update profile (name, email, password). |
| `GET` | `/api/healthz` | Public | Health check — returns `{ status: "ok" }`. Use as the App Service health-check path. |

---

## Automations (business logic inventory)

A complete inventory of automated behaviours. SDR automations live in `artifacts/api-server/src/routes/engagements.ts`.

### Core CRM automations

| # | Name | Where implemented | Trigger | Behaviour |
|---|---|---|---|---|
| A1 | Post-create org next steps | `Organisations.tsx`, `POST /api/organisations` | Organisation created | Shows "What's next?" modal offering quick-create contact or engagement |
| A2 | Auto-task prompt on engagement | `Engagements.tsx`, `POST /api/engagements` | Engagement created with `nextActionDate` | Prompts user to create a linked task pre-filled with next action details |
| A3 | Overdue task auto-marking | `tasks.ts` (`markOverdueTasks`) | `GET /api/tasks` request | Marks all open/in_progress tasks where `due_date < today` as `overdue` |
| A4 | Stage → Won confirm dialog | `EngagementDetail.tsx`, `PUT /api/engagements/:id` | Stage changed to `won` | Confirmation dialog before setting `status = closed_won` |
| A5 | Stage → Dormant reason modal | `EngagementDetail.tsx`, `PUT /api/engagements/:id` | Stage changed to `dormant` | Modal captures a reason before saving |

### SDR automations

| # | Name | Where implemented | Trigger | Behaviour |
|---|---|---|---|---|
| S1 | SDR creation defaults | `POST /api/engagements` | `engagementType=sdr` on create | Sets `sdrStage=new`; assigns `sdrOwnerUserId` to the creating user |
| S2 | Auto-create initial outreach task | `POST /api/engagements` | `engagementType=sdr` on create | Creates "Initial outreach — {orgName}" task assigned to SDR owner |
| S3 | Stage auto-advance from call outcome | `POST /api/engagements/:id/log-call` | Any call log | Derives new `sdrStage` from outcome: `no_answer/voicemail/gatekeeper` → `attempted_call`; `spoke_call_back_later/spoke_send_info` → `follow_up_required`; `spoke_interested` → `interested`; `meeting_booked` → `meeting_booked`; `wrong_person` → `no_contact` |
| S4 | Contact made flag | `POST /api/engagements/:id/log-call` | `spoke_*` outcome | Sets `contactMade=true` |
| S5 | Voicemail flag | `POST /api/engagements/:id/log-call` | `voicemail_left` outcome | Sets `voicemailLeft=true` |
| S6 | Follow-up required flag | `PUT` or log-call | `sdrStage=follow_up_required` or callback/send-info outcome | Sets `followUpRequired=true`; stores `nextCallDate` and `followUpReason` |
| S7 | Meeting booked flag + prep task | `PUT` or log-call with `meeting_booked` | `meetingBooked` flips to `true` | Sets `meetingBooked=true`; creates "Prepare for meeting — {orgName}" task (high priority, due on meeting date) |
| S8 | Disqualify requires reason | `PUT /api/engagements/:id` | `sdrStage=disqualified` | Returns HTTP 400 if `disqualificationReason` is not provided |
| S9 | Terminal stage → closed_lost | `PUT /api/engagements/:id` | Stage moves to `disqualified`, `do_not_contact`, `bad_data`, or `changed_job` | Auto-sets `status=closed_lost` |
| S10 | Qualified → SQL flag | `PUT /api/engagements/:id` | `sdrStage=qualified` | Sets `sqlStatus=true` |
| S11 | Handover → create employer engagement | `POST /api/engagements/:id/handover` | Handover submitted | Sets `sdrStage=qualified`, `handoverStatus=complete`; creates a new `employer_engagement` record for the same organisation (or reuses existing one); optionally creates a follow-up task for the receiving AE |

---

## Roadmap

### Completed in current MVP

- [x] Core CRM: organisations, contacts, engagements, tasks
- [x] RBAC with 4 roles enforced server-side
- [x] Activity log / audit trail with 11 event types
- [x] Microsoft Entra ID SSO migration path documented and structurally ready
- [x] Full call-led SDR module (Call Queue, SDR Pipeline dashboard, SDR Performance report)
- [x] 12-stage SDR pipeline with call outcome tracking
- [x] 11 SDR automations (stage derivation, flags, task creation, handover)
- [x] SDR manager performance report (rep table, meetings by week, terminal breakdown, overdue list)
- [x] Centralised, validated config layer
- [x] Versioned database migrations (drizzle-kit)
- [x] Multi-stage Dockerfile with built-in healthcheck
- [x] Azure deployment readiness documentation

### Remaining MVP items

- [ ] Task calendar view
- [ ] Email activity logging
- [ ] Reporting export (CSV)
- [ ] Live Microsoft Entra ID SSO integration (path documented, code change is isolated to `lib/auth.ts`)

### Azure deployment cutover

See [Azure deployment steps](#azure-deployment-steps-suggested-order) above for the suggested provisioning order.
