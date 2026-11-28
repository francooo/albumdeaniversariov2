import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../services/api/users';
import { getSessionUser, logoutSession } from '../services/api/users';
import { setUnauthorizedHandler } from '../services/api/http';

export type { User as AuthUser };

// Chave usada antes da API (o usuário inteiro ficava no localStorage); só é apagada
const LEGACY_STORAGE_KEY = 'currentUser';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Chamado depois que o servidor abriu a sessão (login, cadastro ou Google). */
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * A sessão vive num cookie httpOnly definido pelo servidor. Ao abrir o site,
 * pergunta ao servidor quem está logado em vez de confiar em dados do navegador.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* opcional */
    }
    // Sessão expirada no meio do uso: volta para o login
    setUnauthorizedHandler(() => setUser(null));
    getSessionUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = (userData: User) => setUser(userData);

  const logout = () => {
    setUser(null);
    logoutSession().catch(() => {});
  };

  const updateUser = (updates: Partial<User>) => setUser(prev => (prev ? { ...prev, ...updates } : prev));

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
