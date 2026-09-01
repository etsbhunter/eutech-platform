"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  AuthApiError,
  AuthUser,
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  registerRequest,
} from "@/lib/authApi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  authenticatedFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
  }, []);

  const redirectToLogin = useCallback(
    (reason?: "session_expired") => {
      const params = new URLSearchParams({ returnUrl: pathname });
      if (reason) params.set("reason", reason);
      router.replace(`/login?${params.toString()}`);
    },
    [pathname, router],
  );

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [setAccessToken]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const { data } = await refreshRequest();
        if (cancelled) return;
        setAccessToken(data.accessToken);
        const me = await meRequest(data.accessToken);
        if (cancelled) return;
        setUser(me.data);
        setStatus("authenticated");
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [setAccessToken]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const { data } = await loginRequest(input);
      setAccessToken(data.accessToken);
      // The login response's user object is intentionally minimal (id/email/
      // fullName only) -- fetch the full shape (including organizations) from
      // /auth/me so the account page never sees a stale/incomplete user, e.g.
      // for someone logging back in who already has an organization.
      const me = await meRequest(data.accessToken);
      setUser(me.data);
      setStatus("authenticated");
    },
    [setAccessToken],
  );

  const register = useCallback(
    async (input: { fullName: string; email: string; password: string }) => {
      const { data } = await registerRequest(input);
      setAccessToken(data.accessToken);
      const me = await meRequest(data.accessToken);
      setUser(me.data);
      setStatus("authenticated");
    },
    [setAccessToken],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    if (!accessTokenRef.current) return;
    const me = await meRequest(accessTokenRef.current);
    setUser(me.data);
  }, []);

  const authenticatedFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!accessTokenRef.current) {
        redirectToLogin();
        throw new AuthApiError("Not authenticated", 401);
      }

      const send = (token: string) =>
        fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
        });

      let response = await send(accessTokenRef.current);

      if (response.status === 401) {
        try {
          const { data } = await refreshRequest();
          setAccessToken(data.accessToken);
          response = await send(data.accessToken);
        } catch {
          clearAuth();
          redirectToLogin("session_expired");
          throw new AuthApiError("Session expired", 401);
        }
      }

      return response;
    },
    [clearAuth, redirectToLogin, setAccessToken],
  );

  return (
    <AuthContext.Provider
      value={{ status, user, login, register, logout, refreshUser, authenticatedFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
