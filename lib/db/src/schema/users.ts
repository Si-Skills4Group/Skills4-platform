/**
 * User
 * D365 Mapping: SystemUser (CRM User / owner)
 * - id            -> systemuserid
 * - full_name     -> fullname
 * - email         -> internalemailaddress
 * - role          -> custom field / security role
 *                    Roles: admin | crm_manager | engagement_user | read_only
 * - is_active     -> isdisabled (inverted)
 * - password_hash -> local auth only (NOT migrated to D365 — replaced by Entra ID)
 *
 * Entra ID / SSO migration note:
 *   When Entra ID is integrated via passport-azure-ad, replace local
 *   password_hash authentication with OID/token-based lookup.
 *   The role field maps to D365 Security Roles after migration.
 */
import { pgTable, text, serial, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role").notNull().default("engagement_user"),
    isActive: boolean("is_active").notNull().default(true),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_is_active_idx").on(t.isActive),
  ]
);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
