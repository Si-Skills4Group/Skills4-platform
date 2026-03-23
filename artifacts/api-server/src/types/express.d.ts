/**
 * Extends Express's Request to carry the authenticated user payload.
 * Populated by the `authenticate` middleware after JWT verification.
 *
 * Entra ID note: when migrating to passport-azure-ad, the same `req.user`
 * shape is populated by the Azure AD passport strategy — no route changes needed.
 */
export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        fullName: string;
        role: string;
      };
    }
  }
}
