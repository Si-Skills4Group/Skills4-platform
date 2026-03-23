import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organisationsTable = pgTable("organisations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  status: text("status").notNull().default("prospect"),
  employeeCount: integer("employee_count"),
  notes: text("notes"),
  ownerId: text("owner_id"),
  ownerName: text("owner_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrganisationSchema = createInsertSchema(organisationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganisation = z.infer<typeof insertOrganisationSchema>;
export type Organisation = typeof organisationsTable.$inferSelect;
