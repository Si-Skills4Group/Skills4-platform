import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.AZURE_POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "AZURE_POSTGRES_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.AZURE_POSTGRES_URL ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
