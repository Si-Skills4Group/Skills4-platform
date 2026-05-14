import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.AZURE_POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("AZURE_POSTGRES_URL or DATABASE_URL must be set, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: process.env.AZURE_POSTGRES_URL ? "require" : undefined,
  },
});
