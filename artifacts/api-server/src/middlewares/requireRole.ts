/**
 * requireRole — role-based access control guard.
 *
 * Role hierarchy (most → least privileged):
 *   admin > crm_manager > engagement_user > read_only
 *
 * Usage:
 *   router.delete("/:id", authenticate, requireRole("admin", "crm_manager"), handler);
 *
 * Entra ID note: roles are mapped from D365 Security Roles to these strings
 * in the passport-azure-ad callback. The guard logic here does not change.
 */
import type { Request, Response, NextFunction } from "express";

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  crm_manager: 3,
  engagement_user: 2,
  read_only: 1,
};

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

export function requireMinRole(minRole: string) {
  const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    if (userLevel < minLevel) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: minRole,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}
