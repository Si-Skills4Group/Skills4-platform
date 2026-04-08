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
 *
 * SDR fields (D365 custom fields on Opportunity or separate SDR entity):
 * - engagement_type        -> custom field: crm_engagementtype (SDR / Employer Engagement / Provider Engagement)
 * - sdr_stage              -> custom field: crm_sdrstage picklist (New / Researching / Outreach Started / Contacted / Response Received / Meeting Booked / Qualified / Disqualified / Nurture)
 * - qualification_status   -> custom field: crm_qualificationstatus
 * - lead_source            -> leadsourcecode (mapped to OOB Lead Source picklist)
 * - sdr_owner_user_id      -> custom field: crm_sdrownerid (SystemUser lookup)
 * - last_outreach_date     -> custom field: crm_lastoutreachdate
 * - next_outreach_date     -> custom field: crm_nextoutreachdate
 * - outreach_channel       -> custom field: crm_outreachchannel (email / phone / linkedin / in_person / event)
 * - touch_count            -> custom field: crm_touchcount
 * - meeting_booked         -> custom field: crm_meetingbooked (boolean)
 * - meeting_date           -> custom field: crm_meetingdate
 * - disqualification_reason -> custom field: crm_disqualificationreason
 * - handover_status        -> custom field: crm_handoverstatus (pending / in_progress / complete)
 * - handover_owner_user_id -> custom field: crm_handoverownerid (SystemUser lookup)
 * - handover_notes         -> custom field: crm_handovernotes
 */
import { pgTable, text, serial, integer, numeric, timestamp, boolean, index } from "drizzle-orm/pg-core";
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

    // ─── Core engagement fields ──────────────────────────────────────────────
    expectedLearnerVolume: integer("expected_learner_volume"),
    expectedValue: numeric("expected_value", { precision: 12, scale: 2 }),
    probability: integer("probability"),
    lastContactDate: text("last_contact_date"),
    nextActionDate: text("next_action_date"),
    nextActionNote: text("next_action_note"),
    notes: text("notes"),

    // ─── SDR fields ──────────────────────────────────────────────────────────
    // engagement_type: SDR | employer_engagement | provider_engagement
    engagementType: text("engagement_type").notNull().default("employer_engagement"),
    // sdr_stage: new | researching | outreach_started | contacted | response_received | meeting_booked | qualified | disqualified | nurture
    sdrStage: text("sdr_stage"),
    qualificationStatus: text("qualification_status"),
    leadSource: text("lead_source"),
    sdrOwnerUserId: integer("sdr_owner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    lastOutreachDate: text("last_outreach_date"),
    nextOutreachDate: text("next_outreach_date"),
    // outreach_channel: email | phone | linkedin | in_person | event
    outreachChannel: text("outreach_channel"),
    touchCount: integer("touch_count").notNull().default(0),
    meetingBooked: boolean("meeting_booked").notNull().default(false),
    meetingDate: text("meeting_date"),
    disqualificationReason: text("disqualification_reason"),
    // handover_status: pending | in_progress | complete
    handoverStatus: text("handover_status"),
    handoverOwnerUserId: integer("handover_owner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    handoverNotes: text("handover_notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("engagements_organisation_id_idx").on(t.organisationId),
    index("engagements_owner_user_id_idx").on(t.ownerUserId),
    index("engagements_stage_idx").on(t.stage),
    index("engagements_status_idx").on(t.status),
    index("engagements_next_action_date_idx").on(t.nextActionDate),
    index("engagements_engagement_type_idx").on(t.engagementType),
    index("engagements_sdr_stage_idx").on(t.sdrStage),
    index("engagements_sdr_owner_user_id_idx").on(t.sdrOwnerUserId),
    index("engagements_handover_owner_user_id_idx").on(t.handoverOwnerUserId),
  ]
);

export const insertEngagementSchema = createInsertSchema(engagementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagementsTable.$inferSelect;
