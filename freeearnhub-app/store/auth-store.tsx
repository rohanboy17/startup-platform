import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";

const TOKEN_KEY = "feh_mobile_token";

export type MobileUser = {
  id: string;
  name: string | null;
  email: string;
  mobile: string | null;
  role: string;
};

type RegisterInput = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: "USER" | "BUSINESS";
  referralCode?: string;
};

type AuthContextValue = {
  isHydrating: boolean;
  isAuthenticated: boolean;
  isBusy: boolean;
  user: MobileUser | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function saveToken(token: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function readToken() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

function authErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);

  const refreshProfile = async () => {
    const currentToken = token ?? (await readToken());
    if (!currentToken) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const data = await apiRequest<{ user: MobileUser }>("/api/mobile/auth/me", {
        method: "GET",
        token: currentToken,
      });
      setToken(currentToken);
      setUser(data.user);
      await saveToken(currentToken);
    } catch {
      setToken(null);
      setUser(null);
      await clearToken();
    }
  };

  useEffect(() => {
    async function hydrate() {
      try {
        const existingToken = await readToken();
        if (!existingToken) return;
        const data = await apiRequest<{ user: MobileUser }>("/api/mobile/auth/me", {
          method: "GET",
          token: existingToken,
        });
        setToken(existingToken);
        setUser(data.user);
      } finally {
        setIsHydrating(false);
      }
    }
    hydrate();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsBusy(true);
    try {
      const data = await apiRequest<{ token: string; user: MobileUser }>("/api/mobile/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      setToken(data.token);
      setUser(data.user);
      await saveToken(data.token);
    } catch (error) {
      throw new Error(authErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setIsBusy(true);
    try {
      await apiRequest<{ message: string; userId: string }>("/api/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      const data = await apiRequest<{ token: string; user: MobileUser }>("/api/mobile/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: input.email, password: input.password }),
      });
      setToken(data.token);
      setUser(data.user);
      await saveToken(data.token);
    } catch (error) {
      throw new Error(authErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await clearToken();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrating,
      isAuthenticated: Boolean(token && user),
      isBusy,
      user,
      token,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [isHydrating, token, user, isBusy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
