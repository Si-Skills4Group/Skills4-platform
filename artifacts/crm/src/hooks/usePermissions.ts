/**
 * usePermissions — maps roles to UI capabilities.
 *
 * Role permissions:
 *   admin          — full access (create, edit, delete, manage users)
 *   crm_manager    — full CRUD, no user management
 *   engagement_user— create and edit; no delete
 *   read_only      — view only
 */
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { hasMinRole, hasRole } = useAuth();

  return {
    canCreate: hasMinRole("engagement_user"),
    canEdit: hasMinRole("engagement_user"),
    canDelete: hasMinRole("crm_manager"),
    isAdmin: hasRole("admin"),
    isCrmManager: hasRole("crm_manager"),
    isReadOnly: hasRole("read_only"),
  };
}
