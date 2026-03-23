/**
 * authenticate — JWT verification middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the token,
 * and attaches the decoded payload to `req.user`.
 *
 * Returns 401 if the header is missing or the token is invalid/expired.
 *
 * Entra ID note: replace `verifyToken` call with passport-azure-ad's
 * `authenticate("oauth-bearer", { session: false })` — the interface on
 * `req.user` stays identical.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token invalid or expired" });
  }
}
