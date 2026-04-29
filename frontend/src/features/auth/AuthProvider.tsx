"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthTokens,
  getMe,
  getStoredAccessToken,
  login as loginRequest,
  logoutRequest,
  register as registerRequest,
  storeAuthTokens,
} from "@/services/api";
import type { AuthResponse, AuthUser } from "@/types/live";

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

  useEffect(() => {
    let active = true;
    if (!getStoredAccessToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        clearAuthTokens();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    storeAuthTokens(response);
    setUser(response.user);
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
    const response = await registerRequest({
      ...payload,
      accept_terms: true,
      accept_privacy: true,
    });
    storeAuthTokens(response);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    clearAuthTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      hasRole: (roles: string[]) => Boolean(user && roles.includes(user.role)),
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
    if (!roleKey.split("|").includes(auth.user.role)) {
      router.replace("/unauthorized");
    }
  }, [auth.loading, auth.user, pathname, roleKey, router]);

  return auth;
}
