# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is an internal employer engagement CRM MVP — a lightweight tool to validate workflow and UX before a Dynamics 365 / Dataverse implementation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + TailwindCSS + Wouter (routing) + React Query
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (routes for all CRM modules)
│   └── crm/               # React + Vite CRM frontend (employer engagement CRM)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts        # Seed script for example data
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## CRM Modules

The CRM has 5 core modules, all mapped to future Dynamics 365 entities:

| CRM Module    | D365 Mapping              | Table              |
|---------------|---------------------------|--------------------|
| Organisations | Account                   | organisations      |
| Contacts      | Contact                   | contacts           |
| Engagements   | Opportunity/Custom Entity | engagements        |
| Tasks         | Activity/Task             | tasks              |
| Dashboard     | —                         | (aggregated views) |

## CRM Frontend Pages

- `/` — Dashboard (summary stats, engagement pipeline chart, upcoming tasks)
- `/organisations` — Organisation list with search + filters (type/sector/region/status); Create/Edit forms; Detail view with linked engagements, contacts, tasks, notes; Quick-create modals for contact/engagement/task
- `/contacts` — Contact list with search (name/email/job title) + org filter; Create/Edit/Delete with email validation; Detail view with linked engagements (where primary contact), organisation tasks, add task modal
- `/engagements` — Engagement pipeline (kanban + table view, HTML5 drag-and-drop, 7 stages, overdue highlighting, search/status filter, create/edit/delete); Detail page at `/engagements/:id` (stage stepper, stats cards, tasks section, notes, add task modal)
- `/engagements/:id` — Engagement detail: stage pipeline stepper (clickable), next-action alert (overdue highlighted), stat cards (value/learners/probability/open tasks), details card, linked tasks table, notes, edit/delete modals; React Query cache updated immediately via `setQueryData` on mutation success
- `/tasks` — Task list with 5 views (All, My Tasks, Overdue, Due This Week, Completed), search + priority filter, mark-complete checkbox, create/edit/delete, status & priority badges, linked to org/engagement with navigation links; "Create Task" button on engagement detail's next-action banner pre-fills title and due date automatically
- `/settings` — User profile settings

## API Routes

All routes under `/api/`:
- `GET/POST /organisations` — list / create
- `GET/PUT/DELETE /organisations/:id` — detail / update / delete
- `GET/POST /contacts` — list / create
- `GET/PUT/DELETE /contacts/:id` — detail / update / delete
- `GET/POST /engagements` — list / create (supports kanban stage filter)
- `GET/PUT/DELETE /engagements/:id` — detail / update / delete
- `GET/POST /tasks` — list / create (supports status/priority filters)
- `GET/PUT/DELETE /tasks/:id` — detail / update / delete
- `GET /dashboard/summary` — aggregated stats for dashboard

## Authentication & RBAC

### Strategy: Local JWT (MVP) — Entra ID ready
- **Backend:** `bcryptjs` (password hashing) + `jsonwebtoken` (7-day tokens)
- **Frontend:** Token stored in `localStorage`; `setAuthTokenGetter` wires it into all API calls
- **Middleware chain:** `authenticate.ts` (JWT verify) → `requireMinRole.ts` (RBAC guard)

### Role Hierarchy
| Role | Level | Permissions |
|---|---|---|
| `admin` | 4 | Full CRUD + user management |
| `crm_manager` | 3 | Full CRUD on all entities |
| `engagement_user` | 2 | Create + edit; **no delete** |
| `read_only` | 1 | View only |

Route-level guards: POST/PUT → `requireMinRole("engagement_user")`, DELETE → `requireMinRole("crm_manager")`

### Entra ID / Microsoft SSO Migration Path
1. Install `passport-azure-ad` (`BearerStrategy`)
2. Replace `signToken`/`verifyToken` in `lib/auth.ts` with passport strategy
3. `authenticate.ts` middleware interface stays unchanged — no route changes needed
4. Remove `password_hash` from `users` table; map OID → user record on first login
5. Role field maps to D365 Security Roles

### Auth Files
- `artifacts/api-server/src/lib/auth.ts` — JWT helpers + migration comments
- `artifacts/api-server/src/middlewares/authenticate.ts` — JWT verification
- `artifacts/api-server/src/middlewares/requireRole.ts` — RBAC guards
- `artifacts/api-server/src/routes/auth.ts` — POST /auth/login, GET /auth/me
- `artifacts/crm/src/contexts/AuthContext.tsx` — React auth state
- `artifacts/crm/src/hooks/usePermissions.ts` — UI permission helpers
- `artifacts/crm/src/components/auth/ProtectedRoute.tsx` — route guard
- `artifacts/crm/src/pages/Login.tsx` — login page with demo account picker

### Demo Accounts
| Email | Password | Role |
|---|---|---|
| admin@company.com | Admin123! | Admin |
| manager@company.com | Manager123! | CRM Manager |
| user@company.com | User123! | Engagement User |
| readonly@company.com | ReadOnly123! | Read Only |

## Database Schema

Located in `lib/db/src/schema/`. Each file contains D365 field-mapping comments at the top.

### `users.ts` — User (D365: SystemUser)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| full_name | text | D365: fullname |
| email | text UNIQUE | D365: internalemailaddress |
| role | text | admin / user |
| is_active | boolean | D365: isdisabled (inverted) |
| created_at / updated_at | timestamp | |

### `organisations.ts` — Organisation (D365: Account)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | D365: name |
| type | text | employer / training_provider / partner → customertypecode |
| sector | text | D365: industrycode |
| region | text | D365: address1_stateorprovince |
| status | text | prospect / active / dormant / closed → statuscode |
| owner_user_id | int FK → users | D365: ownerid |
| website / phone / notes | text | |

### `contacts.ts` — Contact (D365: Contact)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| organisation_id | int FK → organisations | D365: parentcustomerid |
| first_name / last_name | text | D365: firstname / lastname |
| job_title | text | D365: jobtitle |
| email / phone | text | D365: emailaddress1 / telephone1 |
| preferred_contact_method | text | email / phone / post / no_preference → preferredcontactmethodcode |
| notes | text | D365: description |

### `engagements.ts` — Engagement (D365: Opportunity)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| organisation_id | int FK → organisations | D365: customerid |
| primary_contact_id | int FK → contacts | D365: parentcontactid |
| owner_user_id | int FK → users | D365: ownerid |
| title | text | D365: name |
| stage | text | lead / contacted / meeting_booked / proposal / active / won / dormant |
| status | text | open / closed_won / closed_lost / on_hold → statuscode |
| expected_learner_volume | int | D365: custom crm_expectedlearnervolume |
| expected_value | numeric | D365: estimatedvalue |
| probability | int | D365: closeprobability |
| last_contact_date | text | D365: custom crm_lastcontactdate |
| next_action_date | text | D365: custom crm_nextactiondate |
| next_action_note | text | D365: custom crm_nextactionnote |
| notes | text | D365: description |

### `tasks.ts` — Task (D365: Task / Activity)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| organisation_id | int FK → organisations | D365: regardingobjectid (Account) |
| engagement_id | int FK → engagements | D365: regardingobjectid (Opportunity) |
| assigned_user_id | int FK → users | D365: ownerid |
| title | text | D365: subject |
| description | text | D365: description |
| due_date | text | D365: scheduledend |
| priority | text | low / medium / high → prioritycode |
| status | text | open / in_progress / completed / overdue → statuscode |

## Indexes

All FK columns are indexed. Additional indexes:
- `users`: email (unique), is_active
- `organisations`: name, status, type, sector, region, owner_user_id
- `contacts`: organisation_id, last_name, email
- `engagements`: organisation_id, stage, status, owner_user_id, next_action_date
- `tasks`: organisation_id, engagement_id, assigned_user_id, status, priority, due_date

## Seeding

Run seed data (4 users, 7 orgs, 7 contacts, 7 engagements, 9 tasks):
```bash
pnpm --filter @workspace/scripts run seed
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas

## Packages

### `artifacts/crm` (`@workspace/crm`)

React + Vite frontend CRM app. All pages and components live in `src/`. 
- `src/pages/` — Dashboard, Organisations, Contacts, Engagements, Tasks, Settings
- `src/components/layout/AppLayout.tsx` — Sidebar navigation
- `src/components/ui/core-ui.tsx` — Shared UI component library (Button, Input, Card, Table, Badge, Label, etc.)

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/`.
- `src/routes/organisations.ts` — Org CRUD
- `src/routes/contacts.ts` — Contact CRUD  
- `src/routes/engagements.ts` — Engagement CRUD
- `src/routes/tasks.ts` — Task CRUD
- `src/routes/dashboard.ts` — Dashboard summary

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `pnpm --filter @workspace/db run push` — push schema to DB
- `pnpm --filter @workspace/db run push-force` — force push (resets columns)
