import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { getSession, postLogin, postLogout } from "@/lib/api";
import type { AuthSessionResponse } from "@/types";

type AuthContextValue = {
  session: AuthSessionResponse | null;
  loading: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    try {
      const payload = await getSession();
      setSession(payload.authenticated ? payload : null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(payload: { email: string; password: string }) {
    const response = await postLogin(payload);
    setSession(response.authenticated ? response : null);
  }

  async function signOut() {
    await postLogout();
    setSession(null);
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
