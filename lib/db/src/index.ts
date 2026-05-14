import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function buildConnectionString(): { url: string; ssl: boolean } {
  const azureHost = process.env.AZURE_PG_HOST;
  const azureUser = process.env.AZURE_PG_USER;
  const azurePort = process.env.AZURE_PG_PORT ?? "5432";
  const azureDb = process.env.AZURE_PG_DATABASE;
  const azurePass = process.env.AZURE_PG_PASSWORD;

  if (azureHost && azureUser && azureDb && azurePass) {
    const encoded = encodeURIComponent(azurePass);
    return {
      url: `postgresql://${azureUser}:${encoded}@${azureHost}:${azurePort}/${azureDb}?sslmode=require`,
      ssl: true,
    };
  }

  const fallback = process.env.DATABASE_URL;
  if (fallback) {
    return { url: fallback, ssl: false };
  }

  throw new Error(
    "Database connection not configured. Set AZURE_PG_HOST, AZURE_PG_USER, AZURE_PG_DATABASE, and AZURE_PG_PASSWORD, or DATABASE_URL.",
  );
}

const { url, ssl } = buildConnectionString();

export const pool = new Pool({
  connectionString: url,
  ssl: ssl ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
