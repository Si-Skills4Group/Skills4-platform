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
- `/organisations` — Organisation list with search/filter; detail view with contacts tab
- `/contacts` — Contact list with search; linked to organisations
- `/engagements` — Engagement pipeline (kanban + table view), stages from prospect → closed
- `/tasks` — Task list with priority/status filters, overdue highlighting
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

## Database Schema

Located in `lib/db/src/schema/`:
- `organisations.ts` — Organisation model (= D365 Account)
- `contacts.ts` — Contact model (= D365 Contact), FK to organisations
- `engagements.ts` — Engagement model (= D365 Opportunity), FK to orgs and contacts
- `tasks.ts` — Task model (= D365 Activity/Task), FK to orgs, engagements, contacts

## Seeding

Run seed data (6 orgs, 6 contacts, 6 engagements, 8 tasks):
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
