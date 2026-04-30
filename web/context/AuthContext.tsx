"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  type User,
  type AuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
  clearTokens,
  register as apiRegister,
  login as apiLogin,
  logout as apiLogout,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  getMe as apiGetMe,
  refreshTokens as apiRefreshTokens,
} from "@/lib/auth-api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isLearner: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  getAccessToken: () => string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getAccessToken = useCallback(() => {
    return getStoredAccessToken();
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const token = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();
      if (!token || !refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiGetMe(token);
        setUser(me);
      } catch {
        // Token expired — try refresh
        try {
          const tokens = await apiRefreshTokens(refreshToken);
          storeTokens(tokens);
          const me = await apiGetMe(tokens.access_token);
          setUser(me);
        } catch {
          clearTokens();
        }
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      storeTokens({ access_token: res.access_token, refresh_token: res.refresh_token });
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await apiRegister(email, password, displayName);
      storeTokens({ access_token: res.access_token, refresh_token: res.refresh_token });
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch {
        // Proceed even if server call fails
      }
    }
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) return;
    try {
      const me = await apiGetMe(token);
      setUser(me);
    } catch {
      // ignore
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiForgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      await apiResetPassword(token, newPassword);
      router.push("/login");
    },
    [router],
  );

  const currentRole = user?.role ?? null;
  const isAdmin = currentRole === "administrator";
  const isManager = currentRole === "manager";
  const isLearner = currentRole === "learner";

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      role: currentRole,
      isAdmin,
      isManager,
      isLearner,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      getAccessToken,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, forgotPassword, resetPassword, getAccessToken, refreshUser, currentRole, isAdmin, isManager, isLearner],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
