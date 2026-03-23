import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organisationsTable } from "./organisations";
import { engagementsTable } from "./engagements";
import { contactsTable } from "./contacts";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("other"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  dueDate: text("due_date"),
  completedDate: text("completed_date"),
  organisationId: integer("organisation_id").references(() => organisationsTable.id, { onDelete: "set null" }),
  engagementId: integer("engagement_id").references(() => engagementsTable.id, { onDelete: "set null" }),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  ownerId: text("owner_id"),
  ownerName: text("owner_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
