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
 * ────────────────────────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET =
  process.env.JWT_SECRET ??
  "dev-secret-change-in-production-before-deployment";
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;

export interface TokenPayload {
  sub: number;
  email: string;
  fullName: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
