/**
 * AuthContext — manages authentication state for the CRM.
 *
 * Stores the JWT in localStorage and provides login/logout functions.
 * Calls setAuthTokenGetter so all generated API hooks automatically
 * include the Authorization header.
 *
 * Entra ID migration: replace the `login` function with an MSAL/Azure AD
 * redirect. The context shape (user, logout, hasRole) stays identical —
 * no other component needs to change.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "crm_auth_token";
const USER_KEY = "crm_auth_user";

export type UserRole = "admin" | "crm_manager" | "engagement_user" | "read_only";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
}

const ROLE_LEVEL: Record<UserRole, number> = {
  admin: 4,
  crm_manager: 3,
  engagement_user: 2,
  read_only: 1,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(err.error ?? "Login failed");
    }

    const { token, user: authUser } = await res.json() as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setAuthTokenGetter(null);
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const hasMinRole = useCallback((minRole: UserRole) => {
    if (!user) return false;
    return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, hasRole, hasMinRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
