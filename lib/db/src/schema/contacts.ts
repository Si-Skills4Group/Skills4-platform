/**
 * Contact
 * D365 Mapping: Contact
 * - id                       -> contactid
 * - organisation_id          -> parentcustomerid (Account lookup)
 * - first_name               -> firstname
 * - last_name                -> lastname
 * - job_title                -> jobtitle
 * - email                    -> emailaddress1
 * - phone                    -> telephone1
 * - preferred_contact_method -> preferredcontactmethodcode (email | phone | post | no_preference)
 * - notes                    -> description
 */
import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organisationsTable } from "./organisations";

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    organisationId: integer("organisation_id").references(() => organisationsTable.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    jobTitle: text("job_title"),
    email: text("email"),
    phone: text("phone"),
    preferredContactMethod: text("preferred_contact_method").default("email"), // email | phone | post | no_preference
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("contacts_organisation_id_idx").on(t.organisationId),
    index("contacts_last_name_idx").on(t.lastName),
    index("contacts_email_idx").on(t.email),
  ]
);

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
