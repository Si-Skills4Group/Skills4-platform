/**
 * Authentication helpers — local JWT strategy (MVP).
 *
 * ─── Entra ID / Microsoft SSO migration path ────────────────────────────────
 * Replace `signToken` / `verifyToken` with passport-azure-ad:
 *
 *   import { BearerStrategy } from "passport-azure-ad";
 *   const strategy = new BearerStrategy({ ...tenantId, clientID }, cb);
 *   passport.use(strategy);
 *
 * The middleware in `middlewares/authenticate.ts` uses the same interface
 * regardless of strategy — swap the implementation here only.
 *
 * The JWT secret is loaded from the centralised `config` module, which
 * validates that a strong secret is configured in production. In Azure
 * App Service, store the secret in Key Vault and reference it via an
 * App Setting.
 * ────────────────────────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config";

const BCRYPT_ROUNDS = 10;

export interface TokenPayload {
  sub: number;
  email: string;
  fullName: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
