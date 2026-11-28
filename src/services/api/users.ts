import { ApiError, http } from './http';

export interface User {
  id: string;
  email: string;
  name: string;
  public_name?: string;
  birth_date?: string;
  phone?: string;
  avatar_url?: string;
  plan_type: string;
  storage_used: number;
  storage_limit: number;
  is_public_profile: boolean;
  albums_public: boolean;
  show_email: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  default_album_visibility?: 'private' | 'link' | 'public';
  /** A conta tem senha própria (quem só entra pelo Google não tem). */
  has_password?: boolean;
  google_linked?: boolean;
  marketing_opt_in_at?: string;
  marketing_opt_out_at?: string;
  deleted_at?: string;
  deletion_requested_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  birth_date: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  public_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
}

export interface UpdatePrivacyInput {
  is_public_profile?: boolean;
  albums_public?: boolean;
  show_email?: boolean;
  email_notifications?: boolean;
  marketing_emails?: boolean;
  default_album_visibility?: 'private' | 'link' | 'public';
}

// ---------- Sessão ----------

/** Cria a conta e já abre a sessão. */
export function registerUser(input: RegisterInput): Promise<User> {
  return http.post<User>('/auth/register', input);
}

/** Abre a sessão. E-mail ou senha errados devolvem null. */
export async function loginUser(input: LoginInput): Promise<User | null> {
  try {
    return await http.post<User>('/auth/login', input);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'invalid_credentials') return null;
    throw err;
  }
}

/** O servidor confere o token com o Google antes de abrir a sessão. */
export function loginWithGoogle(accessToken: string): Promise<User> {
  return http.post<User>('/auth/google', { accessToken });
}

/** Usuário da sessão atual, ou null se não houver sessão. */
export async function getSessionUser(): Promise<User | null> {
  try {
    return await http.get<User>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function logoutSession(): Promise<void> {
  return http.post('/auth/logout');
}

// ---------- Conta (sempre a do usuário logado; parâmetros userId são ignorados) ----------

export function getUserById(_userId?: string): Promise<User | null> {
  return http.get<User>('/me');
}

export function updateUserProfile(_userId: string, input: UpdateProfileInput): Promise<User> {
  return http.patch<User>('/me', input);
}

export function updatePrivacySettings(_userId: string, input: UpdatePrivacyInput): Promise<User> {
  return http.patch<User>('/me/privacy', input);
}

/** false quando a senha atual não confere. */
export async function changePassword(_userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  return (await http.post<{ ok: boolean }>('/me/password', { currentPassword, newPassword })).ok;
}

export function requestDataExport(_userId?: string): Promise<{ requestId: string; message: string }> {
  return http.post('/me/data-export');
}

export function requestAccountDeletion(_userId?: string, _confirmationMethod?: 'password' | 'text'): Promise<void> {
  return http.post('/me/deletion');
}

export function updateUserPlan(_userId: string, planType: 'basic' | 'premium'): Promise<User> {
  return http.post<User>('/me/plan', { plan: planType });
}

export function getUserStats(_userId?: string): Promise<{
  totalAlbums: number;
  totalSections: number;
  totalPhotos: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
}> {
  return http.get('/me/stats');
}
