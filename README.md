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
│   │       │   ├── engagements.ts   # CRUD + log-call + handover + SDR automations
│   │       │   ├── dashboard.ts     # Summary, SDR pipeline, and SDR manager reports
│   │       │   ├── tasks.ts
│   │       │   ├── contacts.ts
│   │       │   ├── organisations.ts
│   │       │   └── activityLog.ts
│   │       ├── middlewares/     # authenticate.ts, requireRole.ts
│   │       └── lib/
│   │           ├── auth.ts      # JWT helpers (swap for Entra ID here)
│   │           └── logActivity.ts  # Activity log writer
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
│       └── src/schema/          # Drizzle ORM table definitions (D365-annotated)
│           ├── users.ts         # → SystemUser
│           ├── organisations.ts # → Account
│           ├── contacts.ts      # → Contact
│           ├── engagements.ts   # → Opportunity / custom Engagement (+ SDR fields)
│           ├── tasks.ts         # → Task (Activity)
│           └── activityLog.ts   # → Timeline / Audit
├── scripts/
│   └── src/seed.ts              # Demo data (12 orgs, 20 contacts, 15 engagements, 15 SDR prospects, 21 tasks)
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

The `engagements` table serves **two engagement types** via the `engagement_type` discriminator:

- `employer_engagement` — standard 7-stage relationship pipeline (Lead → Won)
- `sdr` — call-led prospecting pipeline with 12 stages and full call-tracking fields

```
engagements (shared fields)
├── id                      serial PK           → opportunityid / custom engagementid
├── engagement_type         text                → crm_engagementtype ('employer_engagement' | 'sdr')
├── organisation_id         int FK → orgs       → customerid (Account lookup)
├── primary_contact_id      int FK → contacts   → parentcontactid (Contact lookup)
├── owner_user_id           int FK → users      → ownerid (SystemUser lookup)
├── title                   text NOT NULL       → name
├── stage                   text                → salesstage / crm_stage (employer_engagement pipeline)
├── status                  text                → statuscode (open | closed_won | closed_lost | on_hold)
├── expected_learner_volume int                 → crm_expectedlearnervolume (custom field)
├── expected_value          numeric(12,2)       → estimatedvalue
├── probability             int                 → closeprobability (0–100)
├── last_contact_date       text (ISO date)     → crm_lastcontactdate
├── next_action_date        text (ISO date)     → crm_nextactiondate
├── next_action_note        text                → crm_nextactionnote
├── notes                   text                → description
├── touch_count             int                 → crm_touchcount
├── outreach_channel        text                → crm_outreachchannel
├── last_outreach_date      text (ISO date)     → crm_lastoutreachdate
├── created_at              timestamp           → createdon
└── updated_at              timestamp           → modifiedon

engagements (SDR-specific fields — populated when engagement_type = 'sdr')
├── sdr_stage               text                → crm_sdrstage (custom picklist)
│                                                  Values: new | researching | attempted_call |
│                                                          contact_made | no_contact | follow_up_required |
│                                                          interested | meeting_booked | qualified |
│                                                          nurture | unresponsive | disqualified |
│                                                          do_not_contact | bad_data | changed_job
├── sdr_owner_user_id       int FK → users      → crm_sdrownerid (SDR rep lookup)
├── handover_owner_user_id  int FK → users      → crm_handoverownerid (AE/BD rep lookup)
├── handover_status         text                → crm_handoverstatus (pending | complete)
├── handover_notes          text                → crm_handovernotes
├── qualification_status    text                → crm_qualificationstatus
├── disqualification_reason text                → crm_disqualificationreason
├── call_attempt_count      int                 → crm_callattemptcount
├── last_call_date          text (ISO date)     → crm_lastcalldate
├── last_call_outcome       text                → crm_lastcalloutcome (custom picklist)
│                                                  Values: no_answer | voicemail_left | gatekeeper |
│                                                          wrong_person | spoke_call_back_later |
│                                                          spoke_send_info | spoke_not_interested |
│                                                          spoke_interested | meeting_booked
├── next_call_date          text (ISO date)     → crm_nextcalldate
├── contact_made            boolean             → crm_contactmade
├── voicemail_left          boolean             → crm_voicemailleft
├── follow_up_required      boolean             → crm_followuprequired
├── follow_up_reason        text                → crm_followupreason
├── meeting_booked          boolean             → crm_meetingbooked
├── meeting_date            text (ISO date)     → crm_meetingdate
├── mql_status              boolean             → crm_mqlstatus (Marketing Qualified Lead)
├── sql_status              boolean             → crm_sqlstatus (Sales Qualified Lead)
├── opportunity_created     boolean             → crm_opportunitycreated
├── pitch_deck_sent         boolean             → crm_pitchdecksent
├── info_sent_date          text (ISO date)     → crm_infosentdate
└── latest_note             text                → crm_latestnote
```

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

### activity_log

```
activity_log
├── id              serial PK           → activityid / custom audit entity
├── event_type      text                → crm_eventtype (custom picklist)
│                                          Values: org_created | contact_added |
│                                                  engagement_created | stage_changed |
│                                                  task_completed | call_logged | task_created
├── entity_type     text                → regardingobjecttypecode
├── entity_id       int                 → regardingobjectid
├── actor_user_id   int FK → users      → ownerid (SystemUser)
├── metadata        jsonb               → JSON blob (expand to structured fields in D365)
└── created_at      timestamp           → createdon
```

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
| `GET` | `/api/dashboard/sdr/manager` | Any | SDR Manager report: `repPerformance` (calls, contacts, meetings, qualified per rep), `meetingsByWeek` (8-week trend), `terminalStageDistribution`, `overdueFollowUps` (detail list). |
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
| Engagement (employer) | `engagements` where `engagement_type='employer_engagement'` | **Opportunity** (standard) or custom **Engagement** table | `opportunity` / `crm_engagement` |
| SDR Prospect | `engagements` where `engagement_type='sdr'` | **Lead** (standard) or custom **SDR Prospect** entity | `lead` / `crm_sdrprospect` |
| Task | `tasks` | **Task** (Activity) | `task` |
| User | `users` | **SystemUser** | `systemuser` |
| Activity Log | `activity_log` | **Timeline** (native) or custom **Audit Log** entity | `activitypointer` / `crm_activitylog` |

#### Decision note: SDR Prospects — Lead vs custom entity

The `sdr` engagement type maps most naturally to the D365 **Lead** entity (which has built-in `leadqualificationcode`, `donotphone`, and activity tracking). However, if the organisation does not use the standard Lead → Opportunity conversion flow, a custom `crm_sdrprospect` entity avoids polluting the Lead form and gives full control over the 12-stage `crm_sdrstage` picklist.

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

**Employer engagement fields:**

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

**SDR-specific fields** (map to Lead or custom `crm_sdrprospect` entity):

| MVP column | D365 attribute | Type in D365 | Notes |
|---|---|---|---|
| `sdr_stage` | `crm_sdrstage` | OptionSet (12 values) | **Custom column** — see stage list in schema section |
| `sdr_owner_user_id` | `crm_sdrownerid` | SystemUser lookup | **Custom column** — the SDR rep |
| `handover_owner_user_id` | `crm_handoverownerid` | SystemUser lookup | **Custom column** — the AE/BD rep |
| `handover_status` | `crm_handoverstatus` | OptionSet | pending / complete |
| `call_attempt_count` | `crm_callattemptcount` | WholeNumber | **Custom column** |
| `last_call_date` | `crm_lastcalldate` | DateOnly | **Custom column** |
| `last_call_outcome` | `crm_lastcalloutcome` | OptionSet (9 values) | **Custom column** — maps to Phone Call activity `directioncode` + custom result |
| `next_call_date` | `crm_nextcalldate` | DateOnly | **Custom column** |
| `contact_made` | `crm_contactmade` | TwoOptions | **Custom column** |
| `voicemail_left` | `crm_voicemailleft` | TwoOptions | **Custom column** |
| `follow_up_required` | `crm_followuprequired` | TwoOptions | **Custom column** |
| `follow_up_reason` | `crm_followupreason` | MultiLine.Text | **Custom column** |
| `meeting_booked` | `crm_meetingbooked` | TwoOptions | **Custom column** |
| `meeting_date` | `crm_meetingdate` | DateOnly | **Custom column** |
| `sql_status` | `crm_sqlstatus` | TwoOptions | **Custom column** — Sales Qualified Lead flag |
| `mql_status` | `crm_mqlstatus` | TwoOptions | **Custom column** — Marketing Qualified Lead flag |
| `latest_note` | `crm_latestnote` | MultiLine.Text | **Custom column** — appended on each call log |
| `disqualification_reason` | `crm_disqualificationreason` | MultiLine.Text | **Custom column** — required on disqualify |

**D365 migration note on Phone Call activities:** The `log-call` endpoint creates a summary entry in `activity_log`. On D365 migration, each call log should create a native **Phone Call** activity record (`phonecall` entity) linked to the Lead/Opportunity via `regardingobjectid`. The `last_call_outcome` maps to a custom result field on the Phone Call form.

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
| `metadata` (JSONB) | Decompose into typed columns | e.g. `crm_stagefrom` / `crm_stageto` for stage_changed; `crm_calloutcome` for call_logged |
| `created_at` | `createdon` | Set by platform |

**Event type mapping:**

| Event | D365 mechanism |
|---|---|
| `org_created` | Native audit log (createdon on Account) |
| `contact_added` | Native audit log; or custom Timeline note |
| `engagement_created` | Native audit log; or custom Timeline note |
| `stage_changed` | Business Process Flow stage history, or Power Automate note to Timeline |
| `task_completed` | Activity status change (system-tracked) |
| `call_logged` | Native Phone Call activity record (`phonecall` entity) |
| `task_created` | Native Task activity record (system-tracked) |

---

## Power Platform migration notes

### What moves to Dataverse

**All six core tables** (`organisations`, `contacts`, `engagements`, `tasks`, `activity_log`, and the SDR fields within `engagements`) become Dataverse entities. The field-level mappings are documented above.

Additional considerations:
- The current **PostgreSQL indexes** map to Dataverse **Quick Find** column configuration and search indexes — configure these on the entity forms.
- **Picklist values** (status, type, sector, stage, sdr_stage, priority, last_call_outcome) become **Choice columns** (formerly OptionSets) in Dataverse.
- **Relationships** (organisation ↔ contact, engagement ↔ task) become native Dataverse **N:1 relationships**.
- The `owner_user_id` / `sdr_owner_user_id` / `assigned_user_id` pattern maps to the Dataverse **Owner** field type.
- The SDR `engagement_type` discriminator can be handled via a separate `crm_sdrprospect` entity, or a shared Opportunity/Lead table filtered by a custom type field.

### What moves to Power Automate

| Automation | Trigger (MVP) | Power Automate / D365 equivalent |
|---|---|---|
| **SDR creation defaults** — `sdrStage=new`, assign SDR owner | `POST /api/engagements` (type=sdr) | When Lead/SDR Prospect created → set default stage and owner via Business Rule or Automate flow |
| **Auto-create initial outreach task** | `POST /api/engagements` (type=sdr) | When Lead created → Create linked Phone Call / Task activity |
| **Stage auto-advance on call outcome** | `POST /api/engagements/:id/log-call` | When Phone Call activity closed with specific result → update Lead stage via Power Automate |
| **Contact made flag** | log-call with spoke_* outcome | When Phone Call result = spoke → set `crm_contactmade = true` via Business Rule |
| **Follow-up required flag** | log-call with spoke_call_back_later / spoke_send_info | When Phone Call result = callback/send info → set `crm_followuprequired = true`, populate `crm_nextcalldate` |
| **Meeting booked flag + prep task** | `PUT` or log-call with meeting_booked outcome | When `crm_meetingbooked` flips to true → create "Prepare for meeting" Task (high priority) |
| **Disqualify requires reason** | `PUT` with sdrStage=disqualified | Business Rule: `crm_disqualificationreason` required when `crm_sdrstage = Disqualified` |
| **Terminal stage → closed_lost** | `PUT` with disqualified/do_not_contact etc. | Business Rule or Power Automate: set Opportunity `statuscode = Closed Lost` |
| **Qualified → SQL flag** | `PUT` with sdrStage=qualified | Business Rule: `crm_sqlstatus = true` when stage = Qualified |
| **Handover → create employer engagement** | `POST /api/engagements/:id/handover` | Power Automate flow: when handover triggered → create/update linked Opportunity, assign to AE, create kickoff task |
| **Post-create org next steps** | `POST /api/organisations` | When Account created → send adaptive card or trigger task creation flow |
| **Overdue task marking** | Server-side scheduled job | Scheduled flow: daily query of open Tasks where `scheduledend < today` → update `statuscode` |

**File:** `artifacts/api-server/src/routes/engagements.ts` — all SDR automations are implemented here, annotated with `// D365 migration:` comments pointing to their Power Automate / Business Rule equivalents.

### What moves to Power BI

| Dashboard panel | Current implementation | Power BI / D365 equivalent |
|---|---|---|
| Engagement pipeline by stage | Recharts bar chart on `/api/dashboard/summary` | Power BI bar chart on Opportunity by `salesstage` |
| Active tasks by status | Recharts donut chart | Power BI donut on Task by `statuscode` |
| Organisations by type | Recharts horizontal bar | Power BI bar on Account by `customertypecode` |
| My Open Tasks | Filtered task list | D365 personal view: "My Open Tasks" |
| Recent Organisations | List with links | D365 system view: "Recently Modified Accounts" |
| **SDR Pipeline Breakdown** | Recharts bar on `/api/dashboard/sdr` | Power BI bar on Lead/SDR Prospect by `crm_sdrstage` |
| **SDR Conversion Funnel** | FunnelBar on SDR dashboard | Power BI funnel chart: Prospects → Contact Made → Meeting → Qualified |
| **Calls Today / Due Today** | Count cards on SDR dashboard | Power BI card visuals or D365 goal metrics |
| **Rep Performance table** | Table on `/api/dashboard/sdr/manager` | Power BI table with per-rep: calls, contacts, meetings, qualified |
| **Meetings by week** | Bar chart on SDR manager report | Power BI time-series bar with `crm_meetingdate` by ISO week |
| **Terminal stage breakdown** | Pie chart on SDR manager report | Power BI donut on Lead by disqualification reason |
| **Overdue follow-ups list** | Table on SDR manager report | D365 system view: "Overdue SDR Follow-ups" filtered by `crm_followuprequired = true` |

**Power BI data source:** Connect directly to Dataverse using the **Power BI Dataverse connector**. All aggregations currently in `artifacts/api-server/src/routes/dashboard.ts` can be replaced by Power BI DAX measures.

---

## Automations (business logic inventory)

A complete inventory of automated behaviours, for CRM developer reference. SDR automations are in `artifacts/api-server/src/routes/engagements.ts`, each annotated with a `// D365 migration:` comment.

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
- [x] RBAC with 4 roles
- [x] Activity log / timeline
- [x] Microsoft Entra ID SSO migration path documented
- [x] Full call-led SDR module (Call Queue, SDR Pipeline dashboard, SDR Performance report)
- [x] 12-stage SDR pipeline with call outcome tracking
- [x] 11 SDR automations (stage derivation, flags, task creation, handover)
- [x] SDR manager performance report (rep table, meetings by week, terminal breakdown, overdue list)
- [x] D365 migration reference for all SDR fields

### Remaining MVP items
- [ ] Task calendar view
- [ ] Email activity logging
- [ ] Reporting export (CSV)
- [ ] Microsoft Entra ID SSO integration

### D365 migration steps (suggested order)

1. **Provision D365 environment** — Sales or Customer Service licence, or Power Apps per-app
2. **Create custom columns** — add SDR fields to Lead or custom `crm_sdrprospect` entity (see field mapping above)
3. **Create custom entities** — if using a custom Engagement entity instead of Opportunity/Lead
4. **Create Choice columns** — `crm_sdrstage` (12 values), `crm_lastcalloutcome` (9 values)
5. **Import data** — export PostgreSQL tables to CSV; import via Power Platform data import wizard or Dataverse bulk import
6. **Rebuild automations** — recreate the 11 SDR automations and 5 core automations in Power Automate / Business Rules (see inventory above)
7. **Replace Dashboard & SDR reports** — build Power BI reports connected to Dataverse; embed in D365 dashboard
8. **Replace auth** — integrate Entra ID; remove `password_hash` from user records
9. **Decommission Express API** — once Power Apps / model-driven app is validated in UAT
10. **Decommission React frontend** — replace with model-driven app or Canvas app connected to Dataverse
