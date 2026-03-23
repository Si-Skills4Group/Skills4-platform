import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organisationsTable } from "./organisations";
import { contactsTable } from "./contacts";

export const engagementsTable = pgTable("engagements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  organisationId: integer("organisation_id").references(() => organisationsTable.id, { onDelete: "set null" }),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  stage: text("stage").notNull().default("prospect"),
  type: text("type").notNull().default("other"),
  value: numeric("value", { precision: 12, scale: 2 }),
  probability: integer("probability"),
  expectedCloseDate: text("expected_close_date"),
  actualCloseDate: text("actual_close_date"),
  description: text("description"),
  notes: text("notes"),
  ownerId: text("owner_id"),
  ownerName: text("owner_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEngagementSchema = createInsertSchema(engagementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagementsTable.$inferSelect;
