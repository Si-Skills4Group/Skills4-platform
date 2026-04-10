# Overview

This project is a pnpm workspace monorepo using TypeScript, designed as an internal employer engagement CRM MVP. Its primary purpose is to validate workflow and user experience before a full implementation with Dynamics 365 / Dataverse. The CRM facilitates the management of organisations, contacts, engagements, and tasks, with a focus on streamlining employer engagement processes. It includes an extended data model to support Sales Development Representative (SDR) workflows.

# User Preferences

I prefer concise and clear communication. I appreciate detailed explanations when introducing new concepts or significant changes. When making changes to the codebase, please prioritize an iterative approach, proposing small, focused modifications. Please ask for my approval before implementing any major architectural changes or introducing new external dependencies. Do not make changes to the `artifacts/api-server/src/lib/auth.ts` file or the `artifacts/crm/src/contexts/AuthContext.tsx` file without explicit instruction.

# System Architecture

The project is structured as a pnpm monorepo.

**Technology Stack:**
- **Monorepo:** pnpm workspaces
- **Frontend:** React 18, Vite, TailwindCSS, Wouter (routing), React Query
- **Backend API:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Build:** esbuild (CJS bundle)
- **TypeScript:** 5.9
- **Node.js:** 24

**Monorepo Structure:**
- `artifacts/api-server/`: Express API server for all CRM modules.
- `artifacts/crm/`: React + Vite frontend for the employer engagement CRM.
- `lib/api-spec/`: OpenAPI specification and Orval codegen configuration.
- `lib/api-client-react/`: Generated React Query hooks.
- `lib/api-zod/`: Generated Zod schemas from OpenAPI.
- `lib/db/`: Drizzle ORM schema and database connection.
- `scripts/`: Contains seed data scripts.

**CRM Modules & Features:**
The CRM encompasses six core modules: Organisations, Contacts, Engagements, Tasks, Dashboard, and SDR Queue, all designed to map to future Dynamics 365 entities.

**Frontend Pages:**
- **Dashboard (`/`):** Displays summary statistics, three types of charts (Engagement Pipeline, Tasks by Status, Organisations by Type), and sections for "My Open Tasks," "Recent Organisations," and "Upcoming Next Actions."
- **Organisations (`/organisations`):** List view with search and filters, forms for creation/editing, a detail view with linked engagements, contacts, tasks, and notes. Includes quick-create modals.
- **Contacts (`/contacts`):** List view with search, forms for creation/editing/deletion with email validation, and a detail view with linked engagements and tasks.
- **Engagements (`/engagements`):** Kanban and table views with HTML5 drag-and-drop, 7 stages, overdue highlighting, search/status filters, and CRUD operations. Detail page (`/engagements/:id`) features a stage stepper, stat cards, task section, and notes.
- **Tasks (`/tasks`):** Five distinct views (All, My Tasks, Overdue, Due This Week, Completed), search, priority filter, mark-complete functionality, CRUD operations, and navigation links to related entities.
- **SDR Dashboard (`/sdr-dashboard`):** SDR-specific dashboard showing 6 metric cards (New Prospects, Due Today, Overdue, Meetings This Week, Qualified, Disqualified), Prospects by Stage bar chart, Conversion Funnel horizontal bar chart, My Tasks list, and Recently Updated prospects list. Auto-refreshes every 60 seconds.
- **SDR Queue (`/sdr`):** Apollo/Salesloft-style SDR workspace. Features: (1) FunnelBar — horizontal scrollable stage-count strip at the top for one-click filtering; (2) FilterPanel — collapsible left sidebar with owner/lead-source/handover-status dropdowns and quick-filter checkboxes; (3) compact prospect table with 6-column CSS grid layout (Contact/Org, Stage badge, Owner initials, Updated, Next Action, Touch count); (4) ProspectDrawer — right-slide panel (420px) with activity timeline, quick log-outreach buttons (Email/Call/LinkedIn), stage action buttons (Interested, Book Meeting, Qualify, Disqualify, More dropdown), and an info grid; modals for Meeting, Disqualify, Create Task, Change Stage, and Handover/Qualify.
- **Settings (`/settings`):** User profile settings.

**SDR Data Model Extension:**
The `Engagement` entity is extended with 15 SDR-specific fields to support an SDR workflow, including `engagement_type`, `sdr_stage`, `qualification_status`, `lead_source`, `sdr_owner_user_id`, and various outreach-related fields.
SDR stage values (active): `new`, `researching`, `contacted`, `replied`, `interested`, `meeting_booked`, `qualified`. Terminal stages: `nurture`, `unresponsive`, `do_not_contact`, `bad_data`, `changed_job`, `disqualified`. Legacy (backward-compat): `outreach_started`, `response_received`. Terminal stages auto-set `status = closed_lost` on transition. `disqualified` requires `disqualificationReason`.
SDR component library lives at `artifacts/crm/src/components/sdr/` — `constants.ts`, `FunnelBar.tsx`, `FilterPanel.tsx`, `ProspectDrawer.tsx`, `index.ts`.

**API Routes:**
All API routes are prefixed with `/api/` and follow RESTful conventions for CRUD operations on Organisations, Contacts, Engagements, and Tasks. Additional routes exist for activity logs and dashboard summaries.

**Authentication & RBAC:**
- **Strategy:** Local JWT for MVP, designed for future migration to Entra ID (Microsoft SSO).
- **Backend:** `bcryptjs` for password hashing and `jsonwebtoken` for 7-day tokens.
- **Frontend:** Token storage in `localStorage`, `setAuthTokenGetter` for API calls.
- **Middleware:** `authenticate.ts` (JWT verification) and `requireMinRole.ts` (RBAC guard).
- **Role Hierarchy:** `admin` (Level 4, full CRUD + user management), `crm_manager` (Level 3, full CRUD), `engagement_user` (Level 2, create + edit, no delete), `read_only` (Level 1, view only).
- **Entra ID Migration Path:** Outlined steps for integrating `passport-azure-ad` for Microsoft SSO.

**API Routes (key additions):**
- `POST /api/engagements/:id/handover` — Qualifies an SDR record and hands it over to an engagement owner. Creates an `employer_engagement` record if one does not exist for the same organisation, updates the SDR record (`sdrStage=qualified`, `handoverStatus=complete`), and optionally creates a follow-up task. Returns `{ sdrEngagement, newEngagement, existingEngagementId, task }`.

**SDR Automations (synchronous, in-process, `engagements.ts`):**
1. **On SDR creation** (`POST /engagements` with `engagementType=sdr`): defaults `sdrStage` to `"new"`, assigns `sdrOwnerUserId` to the authenticated user if not provided, and auto-creates a "Initial outreach — [org]" task (priority: medium).
2. **On stage → contacted** (`PUT /engagements/:id` with `sdrStage=contacted`): automatically sets `lastOutreachDate` to today if not already provided.
3. **On meeting_booked = true** (`PUT /engagements/:id` with `meetingBooked=true`): auto-creates a "Prepare for meeting — [org]" task (priority: high, due date = meeting date).
4. **Disqualify validation**: `sdrStage=disqualified` requires a non-empty `disqualificationReason`; returns HTTP 400 otherwise. Frontend enforces this by disabling the submit button until a reason is entered.

**Database Schema:**
Located in `lib/db/src/schema/`, with Drizzle ORM. Schemas include:
- `users`: Stores user information (id, full_name, email, role, is_active).
- `organisations`: Stores organisation details (id, name, type, sector, region, status, owner_user_id).
- `contacts`: Stores contact details (id, organisation_id, first_name, last_name, job_title, email, phone).
- `engagements`: Stores engagement details (id, organisation_id, primary_contact_id, owner_user_id, title, stage, status, SDR-specific fields).
- `tasks`: Stores task details (id, organisation_id, engagement_id, assigned_user_id, title, description, due_date).
- `activityLog`: Records system events (event_type, entity_type, entity_id, actor_user_id, metadata).

**Indexing:** All foreign key columns are indexed, along with specific fields in `users`, `organisations`, `contacts`, `engagements`, and `tasks` for performance.

**TypeScript & Composite Projects:**
Each package extends a base `tsconfig.base.json` with `composite: true`, and the root `tsconfig.json` lists all packages as project references.

# External Dependencies

- **PostgreSQL:** Primary database for data storage.
- **Drizzle ORM:** Object-relational mapper for database interaction.
- **Orval:** API client code generation from OpenAPI specifications.
- **React Query:** Data fetching and caching for the frontend.
- **Recharts:** Charting library for data visualization in the dashboard.
- **TailwindCSS:** Utility-first CSS framework for styling.
- **Wouter:** Lightweight React router.
- **Express:** Web application framework for the API server.
- **Zod:** TypeScript-first schema declaration and validation library.
- **React Hook Form:** Form management library for React.
- **jsonwebtoken:** For generating and verifying JWTs in the API.
- **bcryptjs:** For hashing user passwords.
- **pnpm:** Package manager and monorepo tool.
- **Vite:** Frontend build tool.
- **esbuild:** Bundler for the API server.