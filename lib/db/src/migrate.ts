/**
 * Standalone migration runner.
 *
 * Run via: `pnpm --filter @workspace/db run migrate`
 *
 * In Azure, run this once during release/post-deploy (e.g. an App Service
 * deployment hook) so the schema is updated before the API starts serving
 * traffic. Do NOT run drizzle-kit `push` against production — always use
 * the versioned migrations under `lib/db/migrations/`.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run migrations.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, "../migrations");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
