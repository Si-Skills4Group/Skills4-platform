/**
 * Organisation
 * D365 Mapping: Account
 * - id             -> accountid
 * - name           -> name
 * - type           -> customertypecode (custom picklist: Employer / Training Provider / Partner)
 * - sector         -> industrycode
 * - region         -> address1_stateorprovince
 * - status         -> statuscode (Prospect / Active / Dormant / Closed)
 * - owner_user_id  -> ownerid (SystemUser lookup)
 * - website        -> websiteurl
 * - phone          -> telephone1
 * - notes          -> description
 */
import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const organisationsTable = pgTable(
  "organisations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull().default("employer"),         // employer | training_provider | partner
    sector: text("sector").notNull(),
    region: text("region"),
    status: text("status").notNull().default("prospect"),     // prospect | active | dormant | closed
    ownerUserId: integer("owner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    website: text("website"),
    phone: text("phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("organisations_name_idx").on(t.name),
    index("organisations_status_idx").on(t.status),
    index("organisations_type_idx").on(t.type),
    index("organisations_owner_user_id_idx").on(t.ownerUserId),
    index("organisations_sector_idx").on(t.sector),
    index("organisations_region_idx").on(t.region),
  ]
);

export const insertOrganisationSchema = createInsertSchema(organisationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganisation = z.infer<typeof insertOrganisationSchema>;
export type Organisation = typeof organisationsTable.$inferSelect;
