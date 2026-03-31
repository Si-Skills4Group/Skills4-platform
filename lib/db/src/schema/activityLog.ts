/**
 * ActivityLog
 * D365 Mapping: ActivityPointer / custom Audit entity
 * - id            -> activityid
 * - event_type    -> custom picklist (org_created / contact_added / engagement_created / stage_changed / task_completed)
 * - entity_type   -> regardingobjecttypecode
 * - entity_id     -> regardingobjectid
 * - actor_user_id -> ownerid (SystemUser)
 * - metadata      -> JSON blob with extra context
 * - created_at    -> createdon
 */
import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activityLogTable = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),   // org_created | contact_added | engagement_created | stage_changed | task_completed
    entityType: text("entity_type").notNull(), // organisation | engagement | contact | task
    entityId: integer("entity_id").notNull(),
    actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    metadata: jsonb("metadata"),               // { orgName, stageTo, stageFrom, taskTitle, contactName, etc. }
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_log_entity_idx").on(t.entityType, t.entityId),
    index("activity_log_actor_idx").on(t.actorUserId),
    index("activity_log_event_type_idx").on(t.eventType),
    index("activity_log_created_at_idx").on(t.createdAt),
  ]
);

export type ActivityLog = typeof activityLogTable.$inferSelect;
