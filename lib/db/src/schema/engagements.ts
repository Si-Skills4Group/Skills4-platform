/**
 * Engagement
 * D365 Mapping: Opportunity (or custom Engagement entity)
 * - id                     -> opportunityid
 * - organisation_id        -> customerid (Account lookup)
 * - primary_contact_id     -> parentcontactid (Contact lookup)
 * - owner_user_id          -> ownerid (SystemUser lookup)
 * - title                  -> name
 * - stage                  -> salesstage / custom picklist (Lead / Contacted / Meeting Booked / Proposal / Active / Won / Dormant)
 * - status                 -> statuscode (Open / Closed Won / Closed Lost / On Hold)
 * - expected_learner_volume -> custom field: crm_expectedlearnervolume
 * - expected_value         -> estimatedvalue
 * - probability            -> closeprobability
 * - last_contact_date      -> custom field: crm_lastcontactdate
 * - next_action_date       -> custom field: crm_nextactiondate (or scheduledend on Task)
 * - next_action_note       -> custom field: crm_nextactionnote
 * - notes                  -> description
 */
import { pgTable, text, serial, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organisationsTable } from "./organisations";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export const engagementsTable = pgTable(
  "engagements",
  {
    id: serial("id").primaryKey(),
    organisationId: integer("organisation_id").references(() => organisationsTable.id, { onDelete: "set null" }),
    primaryContactId: integer("primary_contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
    ownerUserId: integer("owner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    stage: text("stage").notNull().default("lead"),     // lead | contacted | meeting_booked | proposal | active | won | dormant
    status: text("status").notNull().default("open"),   // open | closed_won | closed_lost | on_hold
    expectedLearnerVolume: integer("expected_learner_volume"),
    expectedValue: numeric("expected_value", { precision: 12, scale: 2 }),
    probability: integer("probability"),
    lastContactDate: text("last_contact_date"),
    nextActionDate: text("next_action_date"),
    nextActionNote: text("next_action_note"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("engagements_organisation_id_idx").on(t.organisationId),
    index("engagements_owner_user_id_idx").on(t.ownerUserId),
    index("engagements_stage_idx").on(t.stage),
    index("engagements_status_idx").on(t.status),
    index("engagements_next_action_date_idx").on(t.nextActionDate),
  ]
);

export const insertEngagementSchema = createInsertSchema(engagementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagementsTable.$inferSelect;
