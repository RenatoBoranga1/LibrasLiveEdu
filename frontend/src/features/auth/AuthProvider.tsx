"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthTokens,
  getMe,
  getStoredAccessToken,
  login as loginRequest,
  logoutRequest,
  register as registerRequest,
  storeAuthTokens,
} from "@/services/authApi";
import type { AuthResponse, AuthUser } from "@/types/live";
import { isRoleAllowed, normalizeAuthUser } from "./roles";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    guardian_email?: string;
    school_name?: string;
    birth_date?: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRevision = useRef(0);

  useEffect(() => {
    const handleSessionChange = (event: Event) => {
      const nextUser = (event as CustomEvent<AuthUser | null>).detail;
      setUser(nextUser ? normalizeAuthUser(nextUser) : null);
      setLoading(false);
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);
  }, []);

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    if (!getStoredAccessToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((currentUser) => {
        if (active && revision === sessionRevision.current) setUser(normalizeAuthUser(currentUser));
      })
      .catch(() => {
        if (revision === sessionRevision.current) {
          clearAuthTokens();
          if (active) setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const revision = ++sessionRevision.current;
    const rawResponse = await loginRequest({ email, password });
    const response = { ...rawResponse, user: normalizeAuthUser(rawResponse.user) };
    if (revision === sessionRevision.current) {
      storeAuthTokens(response);
      setUser(response.user);
      setLoading(false);
    }
    return response;
  }, []);

  const register = useCallback(async (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    guardian_email?: string;
    school_name?: string;
    birth_date?: string;
  }) => {
    const revision = ++sessionRevision.current;
    const rawResponse = await registerRequest({
      ...payload,
      accept_terms: true,
      accept_privacy: true,
    });
    const response = { ...rawResponse, user: normalizeAuthUser(rawResponse.user) };
    if (revision === sessionRevision.current) {
      storeAuthTokens(response);
      setUser(response.user);
      setLoading(false);
    }
    return response;
  }, []);

  const logout = useCallback(async () => {
    ++sessionRevision.current;
    const serverLogout = logoutRequest().catch(() => undefined);
    clearAuthTokens();
    setUser(null);
    setLoading(false);
    await serverLogout;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      hasRole: (roles: string[]) => Boolean(user && isRoleAllowed(user.role, roles)),
    }),
    [loading, login, logout, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}

export function useRequireRole(roles: string[]) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const roleKey = roles.join("|");

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isRoleAllowed(auth.user.role, roleKey.split("|"))) {
      router.replace("/unauthorized");
    }
  }, [auth.loading, auth.user, pathname, roleKey, router]);

  return auth;
}
