# Skills4CRM

An internal employer engagement CRM built as a lightweight MVP to validate workflow and UX before a full Dynamics 365 / Dataverse implementation.

## What it does

Skills4CRM helps employer engagement teams manage their relationships with organisations, contacts, and apprenticeship opportunities in one place. It covers the full pipeline from first contact through to active partnership.

**Modules:**
- **Dashboard** — pipeline summary, upcoming tasks, engagement stage breakdown
- **Organisations** — employer, training provider, and partner accounts with full CRUD and linked records
- **Contacts** — people within organisations, linked to engagements and tasks
- **Engagements** — apprenticeship opportunities tracked through a stage pipeline (Lead → Won)
- **Tasks** — internal actions with priority, status, due dates, and overdue highlighting
- **Settings** — user profile management

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Wouter, React Query |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL, Drizzle ORM |
| API spec | OpenAPI 3.0, Orval codegen |
| Auth | JWT (bcryptjs) — Microsoft Entra ID / SSO ready |
| Monorepo | pnpm workspaces, TypeScript project references |

## Project structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 REST API
│   └── crm/                 # React + Vite frontend
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema + connection
├── scripts/
│   └── src/seed.ts          # Demo data seed script
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Getting started

**Prerequisites:** Node.js 20+, pnpm, PostgreSQL

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed

# Start the API server (port from $PORT env var)
pnpm --filter @workspace/api-server run dev

# Start the frontend (separate terminal)
pnpm --filter @workspace/crm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | API server port |

## Demo accounts

The seed script creates four accounts covering each permission level:

| Email | Password | Role | Permissions |
|---|---|---|---|
| admin@company.com | Admin123! | Admin | Full access + user management |
| manager@company.com | Manager123! | CRM Manager | Full CRUD on all records |
| user@company.com | User123! | Engagement User | Create and edit, no delete |
| readonly@company.com | ReadOnly123! | Read Only | View only |

## Authentication

The MVP uses local JWT authentication. The codebase is structured to make migration to Microsoft Entra ID (Azure AD) straightforward:

1. Install `passport-azure-ad` and configure `BearerStrategy`
2. Replace `signToken`/`verifyToken` in `lib/auth.ts` with the passport strategy
3. The `authenticate.ts` middleware interface stays unchanged — no route changes needed
4. Remove `password_hash` from the users table; map the Azure OID to a user record on first login
5. Map Entra ID groups to the existing role hierarchy

## API overview

All routes are prefixed with `/api/`.

```
GET    /api/healthz
POST   /api/auth/login
GET    /api/auth/me

GET    /api/organisations
POST   /api/organisations
GET    /api/organisations/:id
PUT    /api/organisations/:id
DELETE /api/organisations/:id

GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PUT    /api/contacts/:id
DELETE /api/contacts/:id

GET    /api/engagements
POST   /api/engagements
GET    /api/engagements/:id
PUT    /api/engagements/:id
DELETE /api/engagements/:id

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/dashboard/summary
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
```

## RBAC

Route-level role guards enforce the permission hierarchy:

| Role | Level | Create | Edit | Delete | User Mgmt |
|---|---|---|---|---|---|
| `admin` | 4 | ✓ | ✓ | ✓ | ✓ |
| `crm_manager` | 3 | ✓ | ✓ | ✓ | — |
| `engagement_user` | 2 | ✓ | ✓ | — | — |
| `read_only` | 1 | — | — | — | — |

## Database schema

The schema is designed with D365 / Dataverse field mapping in mind — each column includes a comment referencing the equivalent Dynamics 365 attribute name to simplify the eventual migration.

Key tables: `users`, `organisations`, `contacts`, `engagements`, `tasks`

To regenerate API client hooks after modifying the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Roadmap

- [ ] Engagements kanban board view
- [ ] Task calendar view
- [ ] Email activity logging
- [ ] Reporting and export (CSV)
- [ ] Microsoft Entra ID SSO
- [ ] Dynamics 365 / Dataverse migration
