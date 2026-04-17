/**
 * Centralised application configuration.
 *
 * All env vars are read, validated, and frozen on first import. Other modules
 * MUST import from this file rather than reading `process.env` directly.
 *
 * ─── Azure Key Vault migration path ─────────────────────────────────────────
 * In Azure App Service, set these as App Settings (which become env vars) or
 * mount them from Key Vault using Key Vault references:
 *   @Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/)
 * The application code does not change — it always reads from process.env via
 * this module.
 * ───────────────────────────────────────────────────────────────────────────
 */

const DEV_JWT_FALLBACK = "dev-secret-change-in-production-before-deployment";

function readString(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readNumber(key: string): number {
  const raw = readString(key);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid numeric env var ${key}: "${raw}"`);
  }
  return n;
}

const nodeEnv = readString("NODE_ENV", "development");
const isProduction = nodeEnv === "production";

const jwtSecretRaw = process.env["JWT_SECRET"];
if (isProduction && (!jwtSecretRaw || jwtSecretRaw === DEV_JWT_FALLBACK)) {
  throw new Error(
    "JWT_SECRET must be set to a strong random value in production " +
      "(>= 32 characters). Configure it via Azure Key Vault or App Settings.",
  );
}

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  port: readNumber("PORT"),
  databaseUrl: readString("DATABASE_URL"),
  jwtSecret: jwtSecretRaw && jwtSecretRaw !== "" ? jwtSecretRaw : DEV_JWT_FALLBACK,
  jwtExpiresIn: readString("JWT_EXPIRES_IN", "7d"),
  logLevel: readString("LOG_LEVEL", "info"),
  corsOrigin: readString("CORS_ORIGIN", "*"),
});

export type AppConfig = typeof config;
