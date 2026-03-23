/**
 * Task
 * D365 Mapping: Task (Activity)
 * - id               -> activityid
 * - organisation_id  -> regardingobjectid (Account lookup)
 * - engagement_id    -> regardingobjectid (Opportunity lookup, alternative)
 * - assigned_user_id -> ownerid (SystemUser lookup)
 * - title            -> subject
 * - description      -> description
 * - due_date         -> scheduledend
 * - priority         -> prioritycode (Low / Normal=Medium / High)
 * - status           -> statuscode (Open / In Progress / Completed / Overdue)
 */
import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organisationsTable } from "./organisations";
import { engagementsTable } from "./engagements";
import { usersTable } from "./users";

export const tasksTable = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    organisationId: integer("organisation_id").references(() => organisationsTable.id, { onDelete: "set null" }),
    engagementId: integer("engagement_id").references(() => engagementsTable.id, { onDelete: "set null" }),
    assignedUserId: integer("assigned_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date"),
    priority: text("priority").notNull().default("medium"),  // low | medium | high
    status: text("status").notNull().default("open"),        // open | in_progress | completed | overdue
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tasks_organisation_id_idx").on(t.organisationId),
    index("tasks_engagement_id_idx").on(t.engagementId),
    index("tasks_assigned_user_id_idx").on(t.assignedUserId),
    index("tasks_status_idx").on(t.status),
    index("tasks_priority_idx").on(t.priority),
    index("tasks_due_date_idx").on(t.dueDate),
  ]
);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
