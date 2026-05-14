import { defineConfig } from "drizzle-kit";
import path from "path";

function buildConnectionString(): string {
  const azureHost = process.env.AZURE_PG_HOST;
  const azureUser = process.env.AZURE_PG_USER;
  const azurePort = process.env.AZURE_PG_PORT ?? "5432";
  const azureDb = process.env.AZURE_PG_DATABASE;
  const azurePass = process.env.AZURE_PG_PASSWORD;

  if (azureHost && azureUser && azureDb && azurePass) {
    const encoded = encodeURIComponent(azurePass);
    return `postgresql://${azureUser}:${encoded}@${azureHost}:${azurePort}/${azureDb}?sslmode=require`;
  }

  const fallback = process.env.DATABASE_URL;
  if (fallback) return fallback;

  throw new Error(
    "Database connection not configured. Set AZURE_PG_HOST, AZURE_PG_USER, AZURE_PG_DATABASE, and AZURE_PG_PASSWORD, or DATABASE_URL.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: buildConnectionString(),
    ssl: !!process.env.AZURE_PG_HOST ? "require" : undefined,
  },
});
