# Skills4CRM

An internal employer engagement CRM built as a **lightweight MVP** to validate workflow and UX before a full Dynamics 365 / Dataverse implementation.

> **Handoff note for solution architects and CRM developers:** This document is intentionally structured as a migration reference. Every entity, field, API route, and automation has a documented Dynamics 365 equivalent. See the [D365 Migration Reference](#d365-migration-reference) section.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Demo accounts](#demo-accounts)
6. [Authentication & RBAC](#authentication--rbac)
7. [Database schema](#database-schema)
8. [API routes](#api-routes)
9. [D365 Migration Reference](#d365-migration-reference)
   - [Entity mapping](#entity-mapping)
   - [Field mapping: Organisation → Account](#field-mapping-organisation--account)
   - [Field mapping: Contact → Contact](#field-mapping-contact--contact)
   - [Field mapping: Engagement → Opportunity / custom entity](#field-mapping-engagement--opportunity--custom-entity)
   - [Field mapping: Task → Task (Activity)](#field-mapping-task--task-activity)
   - [Field mapping: User → SystemUser](#field-mapping-user--systemuser)
   - [Field mapping: Activity Log → Audit / Timeline](#field-mapping-activity-log--audit--timeline)
10. [Power Platform migration notes](#power-platform-migration-notes)
    - [What moves to Dataverse](#what-moves-to-dataverse)
    - [What moves to Power Automate](#what-moves-to-power-automate)
    - [What moves to Power BI](#what-moves-to-power-bi)
11. [Automations (business logic inventory)](#automations-business-logic-inventory)
12. [Roadmap](#roadmap)

---

## What it does

Skills4CRM helps employer engagement teams manage relationships with organisations, contacts, and apprenticeship opportunities in one place. It covers the full pipeline from first contact through to active partnership.

| Module | Description |
|---|---|
| **Dashboard** | Pipeline summary, overdue tasks, stage breakdown charts, upcoming next actions |
| **Organisations** | Employer, training provider, and partner accounts with full CRUD and linked records |
| **Contacts** | People within organisations, linked to engagements and tasks |
| **Engagements** | Apprenticeship/placement opportunities tracked through a 7-stage pipeline (Lead → Won) |
| **Tasks** | Internal actions with priority, status, due dates, overdue highlighting, and completion |
| **Settings** | User profile management |

---

## Tech stack

| Layer | Technology | D365 equivalent |
|---|---|---|
| Frontend | React 18, Vite, TailwindCSS, Wouter, React Query | Model-driven / Canvas Power App |
| Backend | Express 5, Node.js 24 | Dataverse Web API |
| Database | PostgreSQL, Drizzle ORM | Dataverse (Common Data Service) |
| API spec | OpenAPI 3.0, Orval codegen | Dataverse API auto-generated connectors |
| Auth | JWT (bcryptjs) — Entra ID ready | Microsoft Entra ID (Azure AD) |
| Monorepo | pnpm workspaces, TypeScript | N/A (replaced by Power Platform environment) |

---

## Project structure

```
.
├── artifacts/
│   ├── api-server/              # Express 5 REST API
│   │   └── src/
│   │       ├── routes/          # One file per resource
│   │       ├── middlewares/     # authenticate.ts, requireRole.ts
│   │       └── lib/
│   │           ├── auth.ts      # JWT helpers (swap for Entra ID here)
│   │           └── logActivity.ts  # Activity log writer
│   └── crm/                     # React + Vite frontend
│       └── src/
│           ├── pages/           # One file per module
│           ├── components/      # Shared UI (layout, modals, activity feed)
│           └── contexts/        # AuthContext
├── lib/
│   ├── api-spec/                # OpenAPI 3.0 spec + Orval config
│   ├── api-client-react/        # Generated React Query hooks (do not edit)
│   ├── api-zod/                 # Generated Zod schemas (do not edit)
│   └── db/
│       └── src/schema/          # Drizzle ORM table definitions (D365-annotated)
│           ├── users.ts         # → SystemUser
│           ├── organisations.ts # → Account
│           ├── contacts.ts      # → Contact
│           ├── engagements.ts   # → Opportunity / custom Engagement
│           ├── tasks.ts         # → Task (Activity)
│           └── activityLog.ts   # → Timeline / Audit
├── scripts/
│   └── src/seed.ts              # Demo data seed (12 orgs, 20 contacts, 15 engagements, 18 tasks)
└── pnpm-workspace.yaml
```

---

## Getting started

**Prerequisites:** Node.js 20+, pnpm, PostgreSQL

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (separate terminal)
pnpm --filter @workspace/crm run dev
```

**After modifying the OpenAPI spec**, regenerate the client hooks:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Environment variables

| Variable | Description | D365 equivalent |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Dataverse environment URL |
| `JWT_SECRET` | Secret for JWT signing | Replaced by Entra ID token in D365 |
| `PORT` | API server port | Not applicable |

---

## Demo accounts

| Email | Password | Role | Permissions |
|---|---|---|---|
| admin@company.com | Admin123! | Admin | Full access + user management |
| manager@company.com | Manager123! | CRM Manager | Full CRUD on all records |
| user@company.com | User123! | Engagement User | Create and edit, no delete |
| readonly@company.com | ReadOnly123! | Read Only | View only |

---

## Authentication & RBAC

### Current: Local JWT

The MVP uses local JWT authentication (`bcryptjs` + `jsonwebtoken`). All the auth logic is isolated to two files:

- `artifacts/api-server/src/lib/auth.ts` — `signToken`, `verifyToken`
- `artifacts/api-server/src/middlewares/authenticate.ts` — validates the bearer token on every protected route

### Migration path to Microsoft Entra ID

The middleware interface is **unchanged** by the migration:

```
Step 1: npm install passport-azure-ad
Step 2: Configure BearerStrategy in lib/auth.ts with tenant ID and client ID
Step 3: Replace signToken/verifyToken with passport.authenticate('oauth-bearer')
Step 4: authenticate.ts stays the same — it just calls next() with req.user set
Step 5: Remove password_hash from users table; map Entra ID OID → user record on first login
Step 6: Map Entra ID groups to the role field (admin / crm_manager / engagement_user / read_only)
```

### Role hierarchy

| Role | Level | Create | Edit | Delete | User Mgmt | D365 Security Role |
|---|---|---|---|---|---|---|
| `admin` | 4 | ✓ | ✓ | ✓ | ✓ | System Administrator |
| `crm_manager` | 3 | ✓ | ✓ | ✓ | — | Sales Manager |
| `engagement_user` | 2 | ✓ | ✓ | — | — | Salesperson |
| `read_only` | 1 | — | — | — | — | Marketing Professional (read) |

---

## Database schema

All table definitions are in `lib/db/src/schema/`. Each file carries a JSDoc header mapping every column to its D365 / Dataverse equivalent. The schema is **D365-aligned by design** to minimise migration effort.

### users

```
users
├── id              serial PK           → systemuserid (GUID in D365)
├── full_name       text NOT NULL       → fullname
├── email           text UNIQUE         → internalemailaddress
├── role            text                → custom field / Security Role membership
├── is_active       boolean             → isdisabled (inverted: true here = not disabled)
├── password_hash   text                → LOCAL AUTH ONLY — dropped on Entra ID migration
├── created_at      timestamp
└── updated_at      timestamp
```

### organisations

```
organisations
├── id              serial PK           → accountid (GUID in D365)
├── name            text NOT NULL       → name
├── type            text                → customertypecode (Employer / Training Provider / Partner)
├── sector          text                → industrycode
├── region          text                → address1_stateorprovince
├── status          text                → statuscode (Prospect / Active / Dormant / Closed)
├── owner_user_id   int FK → users      → ownerid (SystemUser lookup)
├── website         text                → websiteurl
├── phone           text                → telephone1
├── notes           text                → description
├── created_at      timestamp           → createdon
└── updated_at      timestamp           → modifiedon
```

### contacts

```
contacts
├── id                      serial PK           → contactid (GUID in D365)
├── organisation_id         int FK → orgs       → parentcustomerid (Account lookup)
├── first_name              text NOT NULL       → firstname
├── last_name               text NOT NULL       → lastname
├── job_title               text                → jobtitle
├── email                   text                → emailaddress1
├── phone                   text                → telephone1
├── preferred_contact_method text               → preferredcontactmethodcode
├── notes                   text                → description
├── created_at              timestamp           → createdon
└── updated_at              timestamp           → modifiedon
```

### engagements

```
engagements
├── id                      serial PK           → opportunityid / custom engagementid
├── organisation_id         int FK → orgs       → customerid (Account lookup)
├── primary_contact_id      int FK → contacts   → parentcontactid (Contact lookup)
├── owner_user_id           int FK → users      → ownerid (SystemUser lookup)
├── title                   text NOT NULL       → name
├── stage                   text                → salesstage / crm_stage (custom picklist)
│                                                  Values: lead | contacted | meeting_booked |
│                                                          proposal | active | won | dormant
├── status                  text                → statuscode
│                                                  Values: open | closed_won | closed_lost | on_hold
├── expected_learner_volume int                 → crm_expectedlearnervolume (custom field)
├── expected_value          numeric(12,2)       → estimatedvalue
├── probability             int                 → closeprobability (0–100)
├── last_contact_date       text (ISO date)     → crm_lastcontactdate (custom field)
├── next_action_date        text (ISO date)     → crm_nextactiondate (custom field)
├── next_action_note        text                → crm_nextactionnote (custom field)
├── notes                   text                → description
├── created_at              timestamp           → createdon
└── updated_at              timestamp           → modifiedon
```

**Design note on `stage` vs `status`:** The `stage` field tracks the sales pipeline position (mutable, user-driven). The `status` field tracks the record lifecycle (open / closed). In D365 the equivalent is `salesstage` (or a custom picklist) for stage, and `statuscode` for the lifecycle.

### tasks

```
tasks
├── id              serial PK           → activityid (GUID in D365)
├── organisation_id int FK → orgs       → regardingobjectid (Account)
├── engagement_id   int FK → engagements → regardingobjectid (Opportunity, alternative)
├── assigned_user_id int FK → users     → ownerid (SystemUser lookup)
├── title           text NOT NULL       → subject
├── description     text                → description
├── due_date        text (ISO date)     → scheduledend
├── priority        text                → prioritycode (Low / Normal / High)
│                                          Values: low | medium | high
├── status          text                → statuscode
│                                          Values: open | in_progress | completed | overdue
├── created_at      timestamp           → createdon
└── updated_at      timestamp           → modifiedon
```

**D365 note on `regardingobjectid`:** In Dataverse, a single `regardingobjectid` polymorphic lookup points to either an Account or Opportunity. The MVP stores both as separate FKs; during migration, choose the most specific relationship (engagement_id if set, otherwise organisation_id).

### activity_log

```
activity_log
├── id              serial PK           → activityid / custom audit entity
├── event_type      text                → crm_eventtype (custom picklist)
│                                          Values: org_created | contact_added |
│                                                  engagement_created | stage_changed |
│                                                  task_completed
├── entity_type     text                → regardingobjecttypecode
├── entity_id       int                 → regardingobjectid
├── actor_user_id   int FK → users      → ownerid (SystemUser)
├── metadata        jsonb               → JSON blob (expand to structured fields in D365)
└── created_at      timestamp           → createdon
```

**D365 migration note:** The `activity_log` table is a custom audit trail. In D365, this maps to the native **Timeline** / **ActivityPointer** mechanism, or a custom `crm_activitylog` entity. The `metadata` JSONB blob should be decomposed into typed columns (e.g., `crm_stagefrom`, `crm_stageto`) on migration.

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
| `GET` | `/api/organisations` | Any | List all organisations. Supports `?search=`, `?type=`, `?status=`, `?sector=`, `?region=` query params. Returns `contactCount` and `engagementCount` per row. |
| `POST` | `/api/organisations` | engagement_user+ | Create an organisation. Logs `org_created` activity. |
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
| `GET` | `/api/engagements` | Any | List engagements. Supports `?search=`, `?stage=`, `?status=`, `?organisationId=`. Returns `organisationName`, `contactName`, `ownerName`. |
| `POST` | `/api/engagements` | engagement_user+ | Create an engagement. Logs `engagement_created` to both the engagement and its organisation. |
| `GET` | `/api/engagements/:id` | Any | Get a single engagement with linked tasks and activity log. |
| `PUT` | `/api/engagements/:id` | engagement_user+ | Update an engagement. If `stage` changes, logs `stage_changed` with `{ stageFrom, stageTo }` metadata. Triggers UI confirmation if moving to `won` or `dormant`. |
| `DELETE` | `/api/engagements/:id` | crm_manager+ | Delete an engagement. |

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

### Dashboard & Users

| Method | Path | Role required | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Any | Returns KPI counts, chart data (`engagementsByStage`, `tasksByStatus`, `organisationsByType`), `myOpenTasks`, `recentOrganisations`, `upcomingNextActions`. |
| `GET` | `/api/users` | Any | List active users (for owner/assignee dropdowns). |
| `GET` | `/api/users/:id` | Any | Get a user profile. |
| `PUT` | `/api/users/:id` | Same user or admin | Update profile (name, email, password). |
| `GET` | `/api/healthz` | Public | Health check — returns `{ status: "ok" }`. |

---

## D365 Migration Reference

### Entity mapping

| MVP entity | Table | D365 / Dataverse entity | Dataverse logical name |
|---|---|---|---|
| Organisation | `organisations` | **Account** | `account` |
| Contact | `contacts` | **Contact** | `contact` |
| Engagement | `engagements` | **Opportunity** (standard) or custom **Engagement** table | `opportunity` / `crm_engagement` |
| Task | `tasks` | **Task** (Activity) | `task` |
| User | `users` | **SystemUser** | `systemuser` |
| Activity Log | `activity_log` | **Timeline** (native) or custom **Audit Log** entity | `activitypointer` / `crm_activitylog` |

#### Decision note: Opportunity vs custom Engagement entity

The standard D365 **Opportunity** entity covers most of the `engagements` table. However, the `expected_learner_volume`, `next_action_date`, and `next_action_note` fields are not standard. Two paths:

- **Use standard Opportunity** — add the three fields as custom columns (`crm_expectedlearnervolume`, `crm_nextactiondate`, `crm_nextactionnote`). Preferred if the organisation already uses D365 Sales.
- **Create a custom Engagement entity** — gives full control and avoids polluting the Opportunity form. Preferred for education-sector implementations without a sales module.

---

### Field mapping: Organisation → Account

| MVP column | D365 attribute | Type in D365 | Notes |
|---|---|---|---|
| `id` | `accountid` | UniqueIdentifier (GUID) | Auto-generated in D365 |
| `name` | `name` | SingleLine.Text | Required |
| `type` | `customertypecode` | OptionSet | Extend with: Employer (200000000), Training Provider (200000001), Partner (200000002) |
| `sector` | `industrycode` | OptionSet | Map to nearest standard industry code or create custom picklist |
| `region` | `address1_stateorprovince` | SingleLine.Text | |
| `status` | `statuscode` | Status | Active = 1, Inactive = 2; add Prospect/Dormant/Closed as custom status reasons |
| `owner_user_id` | `ownerid` | Owner (SystemUser lookup) | |
| `website` | `websiteurl` | SingleLine.Text (URL) | |
| `phone` | `telephone1` | SingleLine.Text (Phone) | |
| `notes` | `description` | MultiLine.Text | |
| `created_at` | `createdon` | DateAndTime | Set by platform |
| `updated_at` | `modifiedon` | DateAndTime | Set by platform |

---

### Field mapping: Contact → Contact

| MVP column | D365 attribute | Type in D365 | Notes |
|---|---|---|---|
| `id` | `contactid` | UniqueIdentifier (GUID) | |
| `organisation_id` | `parentcustomerid` | Customer (Account/Contact) | Set lookup type to Account only |
| `first_name` | `firstname` | SingleLine.Text | |
| `last_name` | `lastname` | SingleLine.Text | Required |
| `job_title` | `jobtitle` | SingleLine.Text | |
| `email` | `emailaddress1` | SingleLine.Text (Email) | |
| `phone` | `telephone1` | SingleLine.Text (Phone) | |
| `preferred_contact_method` | `preferredcontactmethodcode` | OptionSet | Standard D365 field (1=Email, 2=Phone, 3=Fax, 4=Mail) |
| `notes` | `description` | MultiLine.Text | |

---

### Field mapping: Engagement → Opportunity / custom entity

| MVP column | D365 attribute | Type in D365 | Notes |
|---|---|---|---|
| `id` | `opportunityid` | UniqueIdentifier (GUID) | |
| `organisation_id` | `customerid` | Customer (Account) | |
| `primary_contact_id` | `parentcontactid` | Contact lookup | |
| `owner_user_id` | `ownerid` | Owner | |
| `title` | `name` | SingleLine.Text | Required |
| `stage` | `salesstage` or `crm_stage` | OptionSet | Standard salesstage covers Lead/Proposal/Won. Add custom values for Meeting Booked, Active, Dormant. |
| `status` | `statuscode` | Status | Open = 1, Closed Won = 3, Closed Lost = 4 (standard). Add On Hold as custom status reason. |
| `expected_learner_volume` | `crm_expectedlearnervolume` | WholeNumber | **Custom column** |
| `expected_value` | `estimatedvalue` | Money | Standard field |
| `probability` | `closeprobability` | WholeNumber | Standard field (0–100) |
| `last_contact_date` | `crm_lastcontactdate` | DateOnly | **Custom column** |
| `next_action_date` | `crm_nextactiondate` | DateOnly | **Custom column** |
| `next_action_note` | `crm_nextactionnote` | MultiLine.Text | **Custom column** |
| `notes` | `description` | MultiLine.Text | |

---

### Field mapping: Task → Task (Activity)

| MVP column | D365 attribute | Type in D365 | Notes |
|---|---|---|---|
| `id` | `activityid` | UniqueIdentifier (GUID) | |
| `organisation_id` | `regardingobjectid` | Regarding (Account) | Polymorphic lookup |
| `engagement_id` | `regardingobjectid` | Regarding (Opportunity) | Use most specific relationship |
| `assigned_user_id` | `ownerid` | Owner | |
| `title` | `subject` | SingleLine.Text | Required |
| `description` | `description` | MultiLine.Text | |
| `due_date` | `scheduledend` | DateAndTime | |
| `priority` | `prioritycode` | OptionSet | Low = 0, Normal = 1, High = 2 |
| `status` | `statuscode` | Status | Open = 2, Completed = 5. Map In Progress and Overdue to custom status reasons under Open. |

---

### Field mapping: User → SystemUser

| MVP column | D365 attribute | Notes |
|---|---|---|
| `id` | `systemuserid` | GUID in D365 |
| `full_name` | `fullname` | Computed from firstname + lastname in D365 |
| `email` | `internalemailaddress` | Must match Entra ID UPN |
| `role` | Security Role membership | Map: admin → System Admin, crm_manager → Sales Manager, engagement_user → Salesperson, read_only → Marketing Professional |
| `is_active` | `isdisabled` (inverted) | `is_active: true` → `isdisabled: false` |
| `password_hash` | **Not migrated** | Drop this column; Entra ID handles authentication |

---

### Field mapping: Activity Log → Audit / Timeline

| MVP column | D365 approach | Notes |
|---|---|---|
| `event_type` | Custom status reason or `crm_eventtype` column | Create a custom Audit Log entity or use Timeline notes |
| `entity_type` + `entity_id` | `regardingobjectid` + `regardingobjecttypecode` | Native polymorphic regarding lookup |
| `actor_user_id` | `ownerid` | |
| `metadata` (JSONB) | Decompose into typed columns | e.g. `crm_stagefrom` / `crm_stageto` for stage_changed; `crm_contactname` for contact_added |
| `created_at` | `createdon` | Set by platform |

**Recommendation:** On migration, replace the custom `activity_log` table with the D365 native **Timeline** (which records both system-generated and manual notes/activities on any entity). The five `event_type` values map to:

| Event | D365 mechanism |
|---|---|
| `org_created` | Native audit log (createdon on Account) |
| `contact_added` | Native audit log; or custom Timeline note |
| `engagement_created` | Native audit log; or custom Timeline note |
| `stage_changed` | Business Process Flow stage history, or Power Automate note to Timeline |
| `task_completed` | Activity status change (system-tracked) |

---

## Power Platform migration notes

### What moves to Dataverse

**All five core tables** (`organisations`, `contacts`, `engagements`, `tasks`, `activity_log`) become Dataverse entities. The field-level mappings are documented above.

Additional considerations:
- The current **PostgreSQL indexes** map to Dataverse **Quick Find** column configuration and search indexes — configure these on the entity forms.
- **Picklist values** (status, type, sector, stage, priority) become **Choice columns** (formerly OptionSets) in Dataverse. The values are defined in the field mapping tables above.
- **Relationships** (organisation ↔ contact, engagement ↔ task) become native Dataverse **N:1 relationships** — these generate parent-side relationship columns automatically.
- The `owner_user_id` / `assigned_user_id` pattern maps directly to the Dataverse **Owner** field type, which supports both User and Team ownership.

### What moves to Power Automate

The following automations are implemented as **server-side business logic** in the Express API today. On D365 migration, these should become **Power Automate cloud flows** (or Dataverse plug-ins for synchronous requirements):

| Automation | Trigger (MVP) | Power Automate equivalent |
|---|---|---|
| **Post-create org prompt** — "What's next?" modal | `POST /api/organisations` response | When a row is added to `account` → send adaptive card or trigger task creation flow |
| **Auto-task from engagement** — prompt on `nextActionDate` set | `POST /api/engagements` if `nextActionDate` present | When Opportunity row is created with `crm_nextactiondate` → create a linked Task record |
| **Overdue task marking** — cron job marks open tasks past due date as `overdue` | Server-side scheduled job every hour | Scheduled flow: daily query of open Tasks where `scheduledend < today` → update `statuscode` to Overdue |
| **Stage → Won confirmation** — confirm dialog before closing | `PUT /api/engagements/:id` stage change | Business Process Flow stage gate, or a Dataverse real-time workflow on Opportunity close |
| **Stage → Dormant reason capture** — modal to record reason | `PUT /api/engagements/:id` stage change | Power Automate approval flow or Business Rule on the Engagement form to require a reason field |

**File:** `artifacts/api-server/src/routes/engagements.ts` — all five automations are implemented here and in the frontend pages. Review these before migration to ensure Power Automate coverage.

### What moves to Power BI

The following data surfaces in the MVP Dashboard should become **Power BI reports** or **Dataverse dashboards**:

| Dashboard panel | Current implementation | Power BI / D365 equivalent |
|---|---|---|
| Engagement pipeline by stage | Recharts bar chart on `/api/dashboard/summary` | Power BI bar chart on Opportunity by `salesstage`; or D365 native funnel chart |
| Active tasks by status | Recharts donut chart | Power BI donut on Task by `statuscode` |
| Organisations by type | Recharts horizontal bar | Power BI bar on Account by `customertypecode` |
| My Open Tasks | Filtered task list | D365 personal view: "My Open Tasks" |
| Recent Organisations | List with links | D365 system view: "Recently Modified Accounts" |
| Upcoming Next Actions | Engagement list sorted by `next_action_date` | Power BI table or D365 Activity Feed |
| KPI summary cards (Total Orgs, Won, Overdue) | Aggregated counts in Express route | Power BI card visuals or D365 goal metrics |

**Power BI data source:** Connect directly to Dataverse using the **Power BI Dataverse connector** (no custom API needed). All aggregations currently done in `artifacts/api-server/src/routes/dashboard.ts` can be replaced by Power BI DAX measures.

---

## Automations (business logic inventory)

A complete inventory of automated behaviours in the MVP, for CRM developer reference:

| # | Name | Where implemented | Trigger | Behaviour |
|---|---|---|---|---|
| 1 | Post-create org next steps | `Organisations.tsx`, `POST /api/organisations` | Organisation created | Shows "What's next?" modal offering quick-create contact or engagement |
| 2 | Auto-task prompt on engagement | `Engagements.tsx`, `POST /api/engagements` | Engagement created with `nextActionDate` | Prompts user to create a linked task pre-filled with next action details |
| 3 | Overdue task auto-marking | `artifacts/api-server/src/routes/tasks.ts` (`markOverdueTasks`) | `GET /api/tasks` request | Marks all open/in_progress tasks where `due_date < today` as `overdue` |
| 4 | Stage → Won confirm dialog | `EngagementDetail.tsx`, `PUT /api/engagements/:id` | Stage changed to `won` | Confirmation dialog before setting status to `closed_won` |
| 5 | Stage → Dormant reason modal | `EngagementDetail.tsx`, `PUT /api/engagements/:id` | Stage changed to `dormant` | Modal captures a reason before saving |

---

## Roadmap

### MVP remaining items
- [ ] Task calendar view
- [ ] Email activity logging
- [ ] Reporting export (CSV)
- [ ] Microsoft Entra ID SSO integration

### D365 migration steps (suggested order)

1. **Provision D365 environment** — Sales or Customer Service licence, or Power Apps per-app
2. **Create custom columns** — add `crm_expectedlearnervolume`, `crm_nextactiondate`, `crm_nextactionnote` to Opportunity
3. **Create custom entities** — if using a custom Engagement entity instead of Opportunity
4. **Import data** — export PostgreSQL tables to CSV; import via Power Platform data import wizard or Dataverse bulk import
5. **Rebuild automations** — recreate the 5 automations (see above) in Power Automate
6. **Replace Dashboard** — build Power BI report connected to Dataverse; embed in D365 dashboard
7. **Replace auth** — integrate Entra ID; remove `password_hash` from user records
8. **Decommission Express API** — once Power Apps / model-driven app is validated in UAT
9. **Decommission React frontend** — replace with model-driven app or Canvas app connected to Dataverse
