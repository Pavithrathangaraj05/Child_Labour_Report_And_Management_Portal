import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken, setSessionLostHandler } from '../api/client';
import type { User } from '../api/types';

export interface LoginResult {
  user?: User;
  requiresOtp?: boolean;
  challengeId?: string;
  demoOtp?: string;
  message?: string;
}

interface AuthState { user: User | null; loading: boolean; login(email: string, password: string, otp?: string, challengeId?: string): Promise<LoginResult>; logout(): Promise<void> }
const Ctx = createContext<AuthState>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly refresh cookie on page load (access token lives only in memory).
  useEffect(() => {
    api.post('/auth/refresh')
      .then((r) => { setAccessToken(r.data.accessToken); setUser(r.data.user); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    setSessionLostHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string, otp?: string, challengeId?: string): Promise<LoginResult> => {
    const r = await api.post('/auth/login', { email, password, otp, challengeId });
    if (r.data.requiresOtp) {
      return r.data;
    }
    setAccessToken(r.data.accessToken); setUser(r.data.user);
    return { user: r.data.user as User };
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
